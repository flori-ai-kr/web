# Session2 — Prod 인프라 마무리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dev 단일 환경에 prod 환경을 추가한다 — 도메인 정리(dev-admin/dev-api·admin/api·apex=homepage), `flori-prod-app` EC2 + 신규 prod RDS 프로비저닝, dev RDS 폐기 후 dev-app 내 Docker Postgres 전환, api·web prod CICD 구축.

**Architecture:** 기존 flat·local-state Terraform 스택(`aws-infra/flori-ai-tf`)을 **단일 스택 오버레이**로 확장한다 — 공유 VPC/ALB/ACM 와일드카드/Route53 zone/dev-ai 를 그대로 재사용하고, prod 는 `flori-prod-*` 이름의 신규 리소스(EC2·EIP·RDS·SG·IAM·ECR·ALB host rule·Route53 record)만 얹는다. dev web 진입을 `admin.*` → `dev-admin.*` 로 옮기고 `admin.*`/`api.*` 를 prod 로 신규 배선한다. 배포는 ARM64 Docker → ECR(`flori-prod/*`) → SSH `deploy.*.sh` → `flori-prod-app` docker-compose 로, dev 패턴과 동형이되 GitHub Environment `prod` 로 분리한다.

**Tech Stack:** Terraform `~> 5.40` (AWS provider, local state), Amazon Linux 2023 ARM64(t4g), RDS PostgreSQL 16.8, ALB host-based routing, GitHub Actions(`ubuntu-24.04-arm`), Docker compose v2, ECR, Route53/ACM 와일드카드.

---

## 작업 위치 / 브랜치

| 대상 | 경로 | 브랜치 | 머지 정책 |
|------|------|--------|-----------|
| web | `~/Desktop/flori-ai/flori-web-session2` | `feature/session2-infra` (off `origin/dev`) | PR → dev (`/feature-finalize`) |
| api | `~/Desktop/flori-ai/flori-api-session2` | `feature/session2-infra` (off `origin/dev`) | PR → dev (`/feature-finalize`) |
| aws-infra | `~/Desktop/aws-infra` | `main` (직접 커밋·푸시 정책) | main 직접 push |

> 워크트리 2개는 이미 생성됨(Phase 0 완료). aws-infra 는 `main` 직접 커밋 정책이라 워크트리 없이 in-place 작업.

## 도메인 최종 매핑

| 호스트 | 대상 | TG | 인스턴스 |
|--------|------|-----|----------|
| `dev-api.flori.ai.kr` | dev api (Spring :8080) | `flori-dev-app-tg` | flori-dev-app |
| `dev-ai.flori.ai.kr` | ai (FastAPI :8000) | `flori-dev-ai-tg` | flori-dev-ai (공유) |
| `dev-admin.flori.ai.kr` | dev web (Next :3001) | `flori-dev-web-tg` | flori-dev-app |
| `api.flori.ai.kr` | **prod api** (:8080) | `flori-prod-app-tg` | **flori-prod-app** |
| `admin.flori.ai.kr` | **prod web** (:3001) | `flori-prod-web-tg` | **flori-prod-app** |
| `flori.ai.kr` (apex) | homepage (nginx :8082) | `flori-dev-homepage-tg` | flori-dev-app (변경 없음) |
| `www.flori.ai.kr` | → apex 301 | — | — |

ACM 와일드카드 `*.flori.ai.kr` 가 `api.`/`admin.`/`dev-admin.` 전부 커버 → 인증서 변경 불필요.

## ⚠️ 안전·전제

- **dev RDS 폐기는 데이터 손실**이다. 사용자 승인 받음("dev rds는 제거해도 된다"). 그래도 dev Docker PG 기동·스키마 적용·헬스 확인까지 끝낸 **뒤에** dev RDS 를 destroy 한다(Phase 5 순서 고정).
- api `ddl-auto: validate` — 스키마를 **생성하지 않는다**. prod RDS 와 dev Docker PG **둘 다** 부팅 전에 `api/docs/sql/all-tables-ddl.sql` 적용이 선행되어야 api 가 뜬다.
- Terraform `aws_instance` 는 `lifecycle { ignore_changes = [ami] }` 라 AMI 회전으로 인한 교체는 막혀 있다. prod 인스턴스도 동일 패턴 적용.
- `aws-infra/flori-ai-tf` 는 **local state**. apply 전 항상 `terraform plan` 으로 dev 리소스 비파괴 확인.

---

## Phase 0: 워크트리·브랜치 (완료)

- [x] `~/Desktop/flori-ai/flori-web-session2` = `feature/session2-infra` (off origin/dev, b8dae49)
- [x] `~/Desktop/flori-ai/flori-api-session2` = `feature/session2-infra` (off origin/dev, a3574a2)

검증(이미 통과):
```bash
git -C ~/Desktop/flori-ai/flori-web-session2 status -sb   # ## feature/session2-infra...origin/dev
git -C ~/Desktop/flori-ai/flori-api-session2 status -sb   # ## feature/session2-infra...origin/dev
```

---

## Phase 1: Terraform — prod 오버레이 + dev-admin 이전 (aws-infra/flori-ai-tf, in-place)

작업 디렉터리: `cd ~/Desktop/aws-infra/flori-ai-tf`. 모든 apply 전에 `terraform plan` 으로 dev 리소스가 **변경/파괴되지 않는지** 먼저 확인한다.

### Task 1.1: prod 변수 추가

**Files:**
- Modify: `~/Desktop/aws-infra/flori-ai-tf/variables.tf` (append)
- Modify: `~/Desktop/aws-infra/flori-ai-tf/terraform.tfvars` (append + web_subdomain 추가)

- [ ] **Step 1: variables.tf 끝에 prod 변수 블록 추가**

```hcl
# ----------------------------- PROD 오버레이 --------------------------------
# 단일 스택 오버레이: 공유 VPC/ALB/ACM/zone/dev-ai 를 재사용하고 prod 는 아래 변수로
# flori-prod-app EC2 + prod RDS + ECR + ALB host rule 만 추가한다. env 변수는 dev 로 유지.

variable "prod_app_instance_type" {
  description = "flori-prod-app EC2 타입(ARM64). api(Spring)+web(Next) 2컨테이너라 t4g.large 기본."
  type        = string
  default     = "t4g.large"
}

variable "prod_app_root_volume_gb" {
  description = "flori-prod-app 루트 볼륨(gp3, GB)."
  type        = number
  default     = 30
}

variable "prod_db_instance_class" {
  description = "prod RDS 인스턴스 클래스. 베타 절충 db.t4g.micro."
  type        = string
  default     = "db.t4g.micro"
}

variable "prod_db_allocated_storage" {
  description = "prod RDS 초기 스토리지(GB)."
  type        = number
  default     = 20
}

variable "prod_db_max_allocated_storage" {
  description = "prod RDS 스토리지 오토스케일링 상한(GB)."
  type        = number
  default     = 100
}

variable "prod_db_password" {
  description = <<-EOT
    prod RDS 마스터 비밀번호. [HARD] 코드/예시 평문 금지.
    apply 시: export TF_VAR_prod_db_password='...'
  EOT
  type        = string
  default     = ""
  sensitive   = true
}

variable "prod_api_subdomain" {
  description = "prod api 진입 서브도메인. <prod_api_subdomain>.<root_domain> → prod-app TG(8080)."
  type        = string
  default     = "api"
}

variable "prod_web_subdomain" {
  description = "prod web 진입 서브도메인. <prod_web_subdomain>.<root_domain> → prod-web TG(3001)."
  type        = string
  default     = "admin"
}
```

- [ ] **Step 2: terraform.tfvars 에 prod 값 + web_subdomain 이전 추가**

`# ----------------------------- 진입 (Route53/ACM/ALB) ------------------------` 섹션의 `ai_subdomain = "dev-ai"` 바로 아래에 다음 줄을 추가한다:

```hcl
web_subdomain = "dev-admin" # dev web 진입 이전: admin.* → dev-admin.* (admin.* 은 prod 로)
```

그리고 파일 맨 끝에 prod 블록을 추가한다:

```hcl
# ----------------------------- PROD 오버레이 --------------------------------
prod_app_instance_type        = "t4g.large"
prod_app_root_volume_gb       = 30
prod_db_instance_class        = "db.t4g.micro"
prod_db_allocated_storage     = 20
prod_db_max_allocated_storage = 100
prod_api_subdomain            = "api"
prod_web_subdomain            = "admin"
# prod_db_password 는 환경변수로: export TF_VAR_prod_db_password='...'
```

- [ ] **Step 3: 검증**

Run: `cd ~/Desktop/aws-infra/flori-ai-tf && terraform fmt && terraform validate`
Expected: `Success! The configuration is valid.`

### Task 1.2: prod ECR 리포 (flori-prod/api, flori-prod/web)

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-ecr.tf`

- [ ] **Step 1: prod-ecr.tf 작성**

```hcl
# =============================================================================
# prod-ecr.tf — prod 이미지 레지스트리 (flori-prod/api, flori-prod/web)
# =============================================================================
# 단일 스택 오버레이: ecr.tf 의 dev 리포(flori-dev/*)와 별개로 prod 리포를 추가한다.
# lifecycle 정책은 ecr.tf 의 local.ecr_lifecycle_policy 재사용(untagged 7d + tagged keep 10).
# prod 에는 ai·homepage 리포 없음(ai 는 dev-ai 공유, homepage 는 apex=dev 유지).
# -----------------------------------------------------------------------------

locals {
  prod_name_prefix = "${var.project}-prod"     # flori-prod
  ecr_repo_prod_api = "${var.project}-prod/api" # flori-prod/api
  ecr_repo_prod_web = "${var.project}-prod/web" # flori-prod/web
}

resource "aws_ecr_repository" "prod_api" {
  name                 = local.ecr_repo_prod_api
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${local.prod_name_prefix}-ecr-api"
    Env  = "prod"
  }
}

resource "aws_ecr_repository" "prod_web" {
  name                 = local.ecr_repo_prod_web
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "${local.prod_name_prefix}-ecr-web"
    Env  = "prod"
  }
}

resource "aws_ecr_lifecycle_policy" "prod_api" {
  repository = aws_ecr_repository.prod_api.name
  policy     = local.ecr_lifecycle_policy
}

resource "aws_ecr_lifecycle_policy" "prod_web" {
  repository = aws_ecr_repository.prod_web.name
  policy     = local.ecr_lifecycle_policy
}
```

- [ ] **Step 2: 검증 + apply (ECR 만 먼저 — 이미지 push 대상 필요)**

Run: `terraform validate && terraform apply -target=aws_ecr_repository.prod_api -target=aws_ecr_repository.prod_web -target=aws_ecr_lifecycle_policy.prod_api -target=aws_ecr_lifecycle_policy.prod_web`
Expected: 2 repository + 2 lifecycle policy created. plan 에 dev 리소스 변경 0.

### Task 1.3: prod IAM 역할·인스턴스 프로파일

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-iam.tf`

prod-app 은 api(S3 presign 발급은 BFF=api 가 수행) + web 컨테이너를 돌린다. dev app-role 과 동형: ECR pull(flori-prod/*) + S3 이미지 버킷 + CloudWatch Logs(/flori/prod/*) + SSM + CWAgent. Bedrock 미부착.

- [ ] **Step 1: prod-iam.tf 작성**

```hcl
# =============================================================================
# prod-iam.tf — flori-prod-app EC2 역할/인스턴스 프로파일 (단일 스택 오버레이)
# =============================================================================
# dev app-role 과 동형(S3 + ECR pull + Logs + SSM + CWAgent). Bedrock 미부착.
# ECR pull 은 prod 리포(flori-prod/api, flori-prod/web) ARN 한정.
# 신뢰 정책은 iam.tf 의 data.aws_iam_policy_document.ec2_assume 재사용.
# S3 이미지 버킷은 dev 와 동일 버킷(aws_s3_bucket.images) 공유 — prod 도 같은 CDN/버킷 사용.
# -----------------------------------------------------------------------------

# prod ECR pull — flori-prod/* 한정
data "aws_iam_policy_document" "prod_ecr_pull" {
  statement {
    sid       = "EcrAuthToken"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPullProd"
    effect = "Allow"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability"
    ]
    resources = [
      aws_ecr_repository.prod_api.arn,
      aws_ecr_repository.prod_web.arn,
    ]
  }
}

resource "aws_iam_policy" "prod_ecr_pull" {
  name        = "${local.prod_name_prefix}-ecr-pull"
  description = "Flori prod EC2 ECR pull (flori-prod/api, flori-prod/web)"
  policy      = data.aws_iam_policy_document.prod_ecr_pull.json

  tags = {
    Name = "${local.prod_name_prefix}-ecr-pull"
  }
}

# prod CloudWatch Logs — /flori/prod/* 한정
data "aws_iam_policy_document" "prod_cw_logs" {
  statement {
    sid    = "CloudWatchLogsWrite"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]
    resources = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/flori/prod/*"]
  }
}

resource "aws_iam_policy" "prod_cw_logs" {
  name        = "${local.prod_name_prefix}-cw-logs"
  description = "Flori prod EC2 CloudWatch Logs write (/flori/prod/* log groups)"
  policy      = data.aws_iam_policy_document.prod_cw_logs.json

  tags = {
    Name = "${local.prod_name_prefix}-cw-logs"
  }
}

# Role: prod-app — S3(공유 버킷) + ECR pull(prod) + Logs + SSM + CWAgent
resource "aws_iam_role" "prod_app" {
  name               = "${local.prod_name_prefix}-app-role"
  description        = "Flori prod app EC2 role (S3 image bucket + ECR pull prod + logs + SSM)"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json

  tags = {
    Name = "${local.prod_name_prefix}-app-role"
  }
}

resource "aws_iam_role_policy_attachment" "prod_app_s3" {
  role       = aws_iam_role.prod_app.name
  policy_arn = aws_iam_policy.app_s3.arn # dev 와 동일 이미지 버킷 정책 재사용
}

resource "aws_iam_role_policy_attachment" "prod_app_ecr" {
  role       = aws_iam_role.prod_app.name
  policy_arn = aws_iam_policy.prod_ecr_pull.arn
}

resource "aws_iam_role_policy_attachment" "prod_app_logs" {
  role       = aws_iam_role.prod_app.name
  policy_arn = aws_iam_policy.prod_cw_logs.arn
}

resource "aws_iam_role_policy_attachment" "prod_app_ssm" {
  role       = aws_iam_role.prod_app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "prod_app_cwagent" {
  role       = aws_iam_role.prod_app.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "prod_app" {
  name = "${local.prod_name_prefix}-app-profile"
  role = aws_iam_role.prod_app.name
}
```

> **NOTE(S3 공유):** prod 와 dev 가 동일 이미지 버킷을 공유한다. 운영 데이터 격리를 엄격히 하려면 추후 `flori-prod-images-*` 버킷을 분리할 수 있으나, 이번 세션 범위 밖(BFF presign 키는 테넌트 단위 경로라 충돌 없음). 분리 시 `prod_app_s3` 정책을 신규 버킷 ARN 으로 교체.

- [ ] **Step 2: 검증**

Run: `terraform validate`
Expected: valid.

### Task 1.4: prod 보안그룹 (app·rds)

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-sg.tf`

- [ ] **Step 1: prod-sg.tf 작성**

```hcl
# =============================================================================
# prod-sg.tf — prod 보안그룹 (alb 공유 → prod-app → prod-rds)
# =============================================================================
# 공유 ALB SG(aws_security_group.alb) 를 출처로 재사용. prod 전용 app/rds SG 신설.
#   - prod-app-sg : 8080 ← alb-sg, 3001 ← alb-sg. (+옵션 SSH)
#   - prod-rds-sg : 5432 ← prod-app-sg 만.
# -----------------------------------------------------------------------------

resource "aws_security_group" "prod_app" {
  name        = "${local.prod_name_prefix}-sg-app"
  description = "Flori prod app (api :8080 + web :3001) security group"
  vpc_id      = local.vpc_id

  tags = {
    Name = "${local.prod_name_prefix}-sg-app"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# 8080 ← ALB (prod api)
resource "aws_vpc_security_group_ingress_rule" "prod_app_from_alb" {
  security_group_id            = aws_security_group.prod_app.id
  description                  = "api 8080 from ALB SG"
  ip_protocol                  = "tcp"
  from_port                    = 8080
  to_port                      = 8080
  referenced_security_group_id = aws_security_group.alb.id
}

# 3001 ← ALB (prod web Next.js)
resource "aws_vpc_security_group_ingress_rule" "prod_app_web_from_alb" {
  security_group_id            = aws_security_group.prod_app.id
  description                  = "web 3001 from ALB SG (Next.js admin)"
  ip_protocol                  = "tcp"
  from_port                    = 3001
  to_port                      = 3001
  referenced_security_group_id = aws_security_group.alb.id
}

# (옵션) SSH 22 ← var.ssh_ingress_cidrs (dev 와 동일 변수 공유 — GHA SSH 배포용 0.0.0.0/0)
resource "aws_vpc_security_group_ingress_rule" "prod_app_ssh" {
  for_each = toset(var.ssh_ingress_cidrs)

  security_group_id = aws_security_group.prod_app.id
  description       = "SSH from allowed CIDR ${each.value}"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = each.value
}

resource "aws_vpc_security_group_egress_rule" "prod_app_all" {
  security_group_id = aws_security_group.prod_app.id
  description       = "Allow all outbound (RDS, S3, ECR, etc.)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# prod RDS SG — 5432 ← prod-app SG 만
resource "aws_security_group" "prod_rds" {
  name        = "${local.prod_name_prefix}-sg-rds"
  description = "Flori prod RDS PostgreSQL security group (5432 from prod-app SG only)"
  vpc_id      = local.vpc_id

  tags = {
    Name = "${local.prod_name_prefix}-sg-rds"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "prod_rds_from_app" {
  security_group_id            = aws_security_group.prod_rds.id
  description                  = "PostgreSQL from Flori prod-app SG only"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.prod_app.id
}

# (옵션) 개발자 IP 등 한정 CIDR — 스키마 적용/디버그용. var.app_ingress_cidrs 공유.
resource "aws_vpc_security_group_ingress_rule" "prod_rds_from_cidr" {
  for_each = toset(var.app_ingress_cidrs)

  security_group_id = aws_security_group.prod_rds.id
  description       = "PostgreSQL from allowed CIDR ${each.value}"
  ip_protocol       = "tcp"
  from_port         = 5432
  to_port           = 5432
  cidr_ipv4         = each.value
}

resource "aws_vpc_security_group_egress_rule" "prod_rds_all" {
  security_group_id = aws_security_group.prod_rds.id
  description       = "Allow all outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
```

- [ ] **Step 2: 검증**

Run: `terraform validate`
Expected: valid.

### Task 1.5: prod EC2(flori-prod-app) + EIP

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-ec2.tf`

- [ ] **Step 1: prod-ec2.tf 작성**

```hcl
# =============================================================================
# prod-ec2.tf — flori-prod-app EC2 + EIP (단일 스택 오버레이)
# =============================================================================
# dev app 패턴과 동형: AL2023 ARM64, public subnet[0], IMDSv2, ignore_changes=[ami].
# user_data 는 ec2.tf 의 local.ec2_user_data 재사용(docker + compose 설치).
# key_pair 는 dev 와 동일 키(aws_key_pair.flori) 공유.
# -----------------------------------------------------------------------------

resource "aws_instance" "prod_app" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.value
  instance_type          = var.prod_app_instance_type
  subnet_id              = local.public_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.prod_app.id]
  iam_instance_profile   = aws_iam_instance_profile.prod_app.name
  key_name               = var.ssh_public_key == "" ? null : aws_key_pair.flori[0].key_name

  associate_public_ip_address = true
  user_data                   = local.ec2_user_data

  metadata_options {
    http_tokens   = "required" # IMDSv2 강제
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.prod_app_root_volume_gb
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name = "${local.prod_name_prefix}-app"
    Role = "app-server"
    Env  = "prod"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "prod_app" {
  domain   = "vpc"
  instance = aws_instance.prod_app.id

  tags = {
    Name = "${local.prod_name_prefix}-app-eip"
    Env  = "prod"
  }

  depends_on = [aws_instance.prod_app]
}
```

- [ ] **Step 2: 검증**

Run: `terraform validate`
Expected: valid.

### Task 1.6: prod RDS(flori-prod-pg) — 베타 절충

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-rds.tf`

베타 절충 프로파일: `db.t4g.micro` / Single-AZ / `deletion_protection=true` / `skip_final_snapshot=false` / backup 7d.

- [ ] **Step 1: prod-rds.tf 작성**

```hcl
# =============================================================================
# prod-rds.tf — prod RDS PostgreSQL 16 (private, 암호화, 비공개) — 베타 절충
# =============================================================================
# 프로파일: db.t4g.micro / Single-AZ / deletion_protection=true /
#           skip_final_snapshot=false(최종 스냅샷 보존) / backup 7d.
# 공유 private 서브넷 사용(전용 prod 서브넷 그룹). SG 는 prod-rds-sg(prod-app 출처만).
# 비밀번호는 var.prod_db_password (TF_VAR_prod_db_password 환경변수 주입).
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "prod" {
  name        = "${local.prod_name_prefix}-rds-subnet-group"
  description = "Flori prod RDS subnet group (private subnets only)"
  subnet_ids  = local.private_subnet_ids

  tags = {
    Name = "${local.prod_name_prefix}-rds-subnet-group"
  }
}

resource "aws_db_parameter_group" "prod" {
  name        = "${local.prod_name_prefix}-pg16-params"
  family      = "postgres16"
  description = "Flori prod PostgreSQL 16 parameter group"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${local.prod_name_prefix}-pg16-params"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "prod" {
  identifier = "${local.prod_name_prefix}-pg" # flori-prod-pg

  engine         = "postgres"
  engine_version = var.db_engine_version # dev 와 동일 16.8
  instance_class = var.prod_db_instance_class

  db_name  = var.db_name     # flori
  username = var.db_username # flori_admin
  password = var.prod_db_password
  port     = 5432

  allocated_storage     = var.prod_db_allocated_storage
  max_allocated_storage = var.prod_db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.prod.name
  vpc_security_group_ids = [aws_security_group.prod_rds.id]
  publicly_accessible    = false
  multi_az               = false # 베타 절충 Single-AZ

  parameter_group_name = aws_db_parameter_group.prod.name

  backup_retention_period = 7
  backup_window           = "17:00-18:00"
  maintenance_window      = "sun:18:00-sun:19:00"
  copy_tags_to_snapshot   = true

  deletion_protection       = true  # [운영] 실수 삭제 방지
  skip_final_snapshot       = false # [운영] 삭제 시 최종 스냅샷 보존
  final_snapshot_identifier = "${local.prod_name_prefix}-pg-final"

  performance_insights_enabled = true
  auto_minor_version_upgrade   = true

  tags = {
    Name = "${local.prod_name_prefix}-pg"
    Env  = "prod"
  }
}
```

- [ ] **Step 2: 검증**

Run: `terraform validate`
Expected: valid.

### Task 1.7: prod ALB host rule + TG + Route53, dev-admin 이전

**Files:**
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-alb.tf`
- Create: `~/Desktop/aws-infra/flori-ai-tf/prod-route53.tf`

ALB 리스너 우선순위 현황: api=10, ai=20, web(dev-admin)=30, homepage=40, www=41. prod 는 50/60 사용.

- [ ] **Step 1: prod-alb.tf 작성**

```hcl
# =============================================================================
# prod-alb.tf — prod Target Group + ALB host rule (공유 ALB/리스너 재사용)
# =============================================================================
# 공유 aws_lb.flori + aws_lb_listener.https 에 prod host rule 만 얹는다.
#   - api.flori.ai.kr  → prod-app TG(8080), priority 50
#   - admin.flori.ai.kr → prod-web TG(3001), priority 60
# TG attachment 은 flori-prod-app 인스턴스의 host:8080 / host:3001.
# -----------------------------------------------------------------------------

resource "aws_lb_target_group" "prod_app" {
  name        = "${local.prod_name_prefix}-app-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/actuator/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${local.prod_name_prefix}-app-tg"
  }
}

resource "aws_lb_target_group" "prod_web" {
  name        = "${local.prod_name_prefix}-web-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${local.prod_name_prefix}-web-tg"
  }
}

resource "aws_lb_target_group_attachment" "prod_app" {
  target_group_arn = aws_lb_target_group.prod_app.arn
  target_id        = aws_instance.prod_app.id
  port             = 8080
}

resource "aws_lb_target_group_attachment" "prod_web" {
  target_group_arn = aws_lb_target_group.prod_web.arn
  target_id        = aws_instance.prod_app.id
  port             = 3001
}

# host: api.flori.ai.kr → prod-app TG
resource "aws_lb_listener_rule" "prod_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prod_app.arn
  }

  condition {
    host_header {
      values = ["${var.prod_api_subdomain}.${var.root_domain}"]
    }
  }
}

# host: admin.flori.ai.kr → prod-web TG
resource "aws_lb_listener_rule" "prod_web" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 60

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prod_web.arn
  }

  condition {
    host_header {
      values = ["${var.prod_web_subdomain}.${var.root_domain}"]
    }
  }
}
```

- [ ] **Step 2: prod-route53.tf 작성**

```hcl
# =============================================================================
# prod-route53.tf — prod alias(A) 레코드 (공유 zone)
# =============================================================================
# api.flori.ai.kr / admin.flori.ai.kr → 공유 ALB. ACM 와일드카드가 TLS 커버.
# dev-admin.flori.ai.kr 레코드는 route53.tf 의 aws_route53_record.web 이
# var.web_subdomain="dev-admin" 으로 바뀌며 자동 이전됨(추가 리소스 불필요).
# -----------------------------------------------------------------------------

resource "aws_route53_record" "prod_api" {
  zone_id = aws_route53_zone.flori.zone_id
  name    = "${var.prod_api_subdomain}.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.flori.dns_name
    zone_id                = aws_lb.flori.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "prod_web" {
  zone_id = aws_route53_zone.flori.zone_id
  name    = "${var.prod_web_subdomain}.${var.root_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.flori.dns_name
    zone_id                = aws_lb.flori.zone_id
    evaluate_target_health = true
  }
}
```

- [ ] **Step 3: prod outputs 추가 (선택, 편의)**

`~/Desktop/aws-infra/flori-ai-tf/outputs.tf` 끝에 추가:

```hcl
output "prod_app_public_ip" {
  description = "flori-prod-app EIP (GitHub Secrets SSH_HOST 용)"
  value       = aws_eip.prod_app.public_ip
}

output "prod_rds_endpoint" {
  description = "prod RDS 엔드포인트 (DB_URL 구성용)"
  value       = aws_db_instance.prod.address
}

output "prod_ecr_api_url" {
  description = "flori-prod/api ECR 리포 URL"
  value       = aws_ecr_repository.prod_api.repository_url
}

output "prod_ecr_web_url" {
  description = "flori-prod/web ECR 리포 URL"
  value       = aws_ecr_repository.prod_web.repository_url
}
```

- [ ] **Step 4: 전체 plan 확인 — dev-admin 이전 영향 검토**

Run: `terraform fmt && terraform validate && terraform plan -out=prod.plan`
Expected 변경 요약:
- `aws_route53_record.web`: **update in place** (name admin→dev-admin) 또는 replace
- `aws_lb_listener_rule.web`: **update in place** (condition host admin→dev-admin)
- 신규: prod EC2/EIP/RDS/2 TG/2 attachment/2 listener rule/2 route53/IAM/SG 일체
- **dev EC2·dev RDS·dev TG·ai·ALB 본체·zone 파괴 0건** 확인 (반드시 육안 검증)

> 🔴 dev RDS(`aws_db_instance.this`) 가 plan 에 destroy 로 잡히면 **중단**. 이 단계에서는 dev RDS 를 건드리지 않는다(폐기는 Phase 5).

- [ ] **Step 5: apply**

Run: `export TF_VAR_db_password='<dev기존값>' TF_VAR_prod_db_password='<신규prod비번>' && terraform apply prod.plan`
Expected: prod 리소스 생성 + dev-admin 이전 완료. RDS 생성은 수 분 소요.

- [ ] **Step 6: 산출물 기록**

Run: `terraform output prod_app_public_ip prod_rds_endpoint prod_ecr_api_url prod_ecr_web_url`
이 값들을 Phase 4/6/7 에서 사용한다. 메모해 둘 것.

- [ ] **Step 7: aws-infra main 커밋·푸시**

```bash
cd ~/Desktop/aws-infra
git add flori-ai-tf/variables.tf flori-ai-tf/terraform.tfvars flori-ai-tf/prod-ecr.tf flori-ai-tf/prod-iam.tf flori-ai-tf/prod-sg.tf flori-ai-tf/prod-ec2.tf flori-ai-tf/prod-rds.tf flori-ai-tf/prod-alb.tf flori-ai-tf/prod-route53.tf flori-ai-tf/outputs.tf
git commit -m "feat(flori): prod 오버레이 — flori-prod-app EC2·prod RDS·ECR·ALB(api./admin.)·dev-admin 이전

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

> ⚠️ `terraform.tfvars` 는 gitignore 대상일 수 있음. `git status` 로 확인 후 추적되지 않으면 add 에서 제외(평문 비번 커밋 금지).

---

## Phase 2: prod-app 서버 자산 (aws-infra/flori-prod-servers/, in-place)

dev 의 `flori-dev-servers/app/` 패턴을 prod 로 복제하되 **homepage 제외**(api+web 2서비스), ECR 를 `flori-prod/*` 로, env 를 prod 값으로 바꾼다.

### Task 2.1: prod compose + 배포 스크립트 + env 예시

**Files:**
- Create: `~/Desktop/aws-infra/flori-prod-servers/app/docker/docker-compose.yml`
- Create: `~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.api.sh`
- Create: `~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.web.sh`
- Create: `~/Desktop/aws-infra/flori-prod-servers/app/.env.api.example`
- Create: `~/Desktop/aws-infra/flori-prod-servers/app/.env.web.example`

- [ ] **Step 1: dev 자산을 참조 복사**

Run: `cp -r ~/Desktop/aws-infra/flori-dev-servers/app ~/Desktop/aws-infra/flori-prod-servers/app && rm -f ~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.homepage.sh ~/Desktop/aws-infra/flori-prod-servers/app/.env.homepage.example`
그리고 실제 env 파일(env/.env.api 등 gitignore된 실값)이 복사됐다면 삭제: `rm -rf ~/Desktop/flori-prod-servers/app/env/*` (실값은 Phase 4 에서 서버에서 직접 생성).

- [ ] **Step 2: docker-compose.yml 에서 homepage 서비스 제거 + ECR 를 flori-prod 로 교체**

`~/Desktop/aws-infra/flori-prod-servers/app/docker/docker-compose.yml` 를 다음 내용으로 정리(homepage 블록 삭제, 이미지 `flori-dev/*`→`flori-prod/*`):

```yaml
# flori-prod-app docker-compose — api(:8080) + web(:3001). homepage 없음(apex=dev 유지).
# 이미지 태그는 deploy.*.sh 가 .env 의 TAG/WEB_TAG 로 주입. ECR account/region 은 스크립트가 채움.
services:
  api:
    image: ${ECR_REGISTRY}/flori-prod/api:${TAG:-latest}
    container_name: flori-prod-api
    restart: unless-stopped
    ports:
      - "0.0.0.0:8080:8080"
    env_file:
      - /home/ec2-user/env/.env.api
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    mem_limit: 2048m
    networks:
      - app-net

  web:
    image: ${ECR_REGISTRY}/flori-prod/web:${WEB_TAG:-latest}
    container_name: flori-prod-web
    restart: unless-stopped
    ports:
      - "0.0.0.0:3001:3000"
    env_file:
      - /home/ec2-user/env/.env.web
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O /dev/null http://localhost:3000/ || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
    mem_limit: 768m
    networks:
      - app-net

networks:
  app-net:
    name: flori-prod-app_app-net
    driver: bridge
```

> 실제 dev compose 의 `${ECR_REGISTRY}`/`TAG` 주입 방식·healthcheck 표기를 **dev 파일 그대로** 따르고 이미지 prefix 와 container_name·network 이름만 `flori-prod` 로 바꾼다. 위는 표준형; dev 파일에 environment 블록/추가 옵션이 있으면 보존.

- [ ] **Step 3: deploy.api.sh / deploy.web.sh 의 ECR repo 를 flori-prod 로 교체**

`deploy.api.sh` 내부의 `flori-dev/api` → `flori-prod/api`, `deploy.web.sh` 내부 `flori-dev/web` → `flori-prod/web` 로 치환. 헬스체크 포트(8080/3001)·compose 경로(`/home/ec2-user/docker/docker-compose.yml`)·Discord 웹훅 로직은 dev 그대로 유지.

Run(치환 예): `sed -i '' 's#flori-dev/api#flori-prod/api#g' ~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.api.sh && sed -i '' 's#flori-dev/web#flori-prod/web#g' ~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.web.sh`

- [ ] **Step 4: .env.api.example (prod 값)**

```bash
# flori-prod-app /home/ec2-user/env/.env.api 예시 — 실값은 서버에서 직접 채움(커밋 금지)
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://<PROD_RDS_ENDPOINT>:5432/flori
DB_USER=flori_admin
DB_PASSWORD=REPLACE_ME
JWT_SECRET=REPLACE_WITH_STRONG_32BYTES_OR_MORE
AWS_REGION=ap-northeast-2
S3_BUCKET=flori-dev-images-c4b9e4a9
CLOUDFRONT_DOMAIN=d2u9ujcp5in43y.cloudfront.net
INTERNAL_API_KEY=REPLACE_INTERNAL_API_KEY_AT_LEAST_32_CHARS
CORS_ALLOWED_ORIGINS=https://admin.flori.ai.kr
SPRINGDOC_API_DOCS_ENABLED=false
SPRINGDOC_SWAGGER_UI_ENABLED=false
# 소셜 OAuth (prod 앱 키 — 콜백 https://api.flori.ai.kr 등록 필요)
KAKAO_REST_API_KEY=REPLACE_ME
KAKAO_CLIENT_SECRET=REPLACE_ME
GOOGLE_CLIENT_ID=REPLACE_ME
GOOGLE_CLIENT_SECRET=REPLACE_ME
NAVER_CLIENT_ID=REPLACE_ME
NAVER_CLIENT_SECRET=REPLACE_ME
# VAPID (web NEXT_PUBLIC_VAPID_PUBLIC_KEY 와 키페어 일치)
VAPID_PUBLIC_KEY=REPLACE_ME
VAPID_PRIVATE_KEY=REPLACE_ME
VAPID_SUBJECT=mailto:admin@flori.ai.kr
# Discord (선택)
DISCORD_WEBHOOK_URL=
DISCORD_SIGNUP_WEBHOOK_URL=
DISCORD_VERIFICATION_WEBHOOK_URL=
# AI 게이트웨이 — prod 도 dev-ai 공유(내부 호출). 미설정 시 AI 기능 비활성.
AI_SERVER_URL=
AI_INTERNAL_KEY=
AI_HEALTH_SERVER_URL=
AI_HEALTH_LITELLM_URL=
```

> `<PROD_RDS_ENDPOINT>` 는 Phase 1 Step 6 의 `prod_rds_endpoint` 출력값. `S3_BUCKET`/`CLOUDFRONT_DOMAIN` 은 dev 와 동일 버킷 공유(Task 1.3 NOTE).

- [ ] **Step 5: .env.web.example (prod 값)**

```bash
# flori-prod-app /home/ec2-user/env/.env.web 예시 — 런타임 주입(커밋 금지)
NODE_ENV=production
API_URL=https://api.flori.ai.kr
INTERNAL_API_KEY=REPLACE_INTERNAL_API_KEY_AT_LEAST_32_CHARS
STORAGE_PUBLIC_URL=https://d2u9ujcp5in43y.cloudfront.net
NEXT_PUBLIC_KAKAO_OPENCHAT_URL=https://open.kakao.com/o/REPLACE
# 선택: 애널리틱스(빌드 타임 baked 이므로 web prod 워크플로 build-arg 로도 주입됨)
# NEXT_PUBLIC_GA_MEASUREMENT_ID=
# NEXT_PUBLIC_CLARITY_PROJECT_ID=
DISCORD_WEBHOOK_URL=
```

> `API_URL`·`INTERNAL_API_KEY` 는 web 런타임(서버) 변수. `INTERNAL_API_KEY` 는 api 의 동일 값과 일치해야 내부 호출이 통과한다.

- [ ] **Step 6: 커밋·푸시 (실값 env 제외)**

```bash
cd ~/Desktop/aws-infra
git add flori-prod-servers/app/docker/docker-compose.yml flori-prod-servers/app/scripts/deploy.api.sh flori-prod-servers/app/scripts/deploy.web.sh flori-prod-servers/app/.env.api.example flori-prod-servers/app/.env.web.example
git commit -m "feat(flori): flori-prod-servers 자산 — compose(api+web)·deploy 스크립트·env 예시

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## Phase 3: prod-app 부팅 — 자산 배치 + 스키마 적용 (수동/SSM)

prod-app EC2 는 user_data 로 docker/compose 만 설치된 상태. deploy.*.sh 가 참조하는 표준 디렉터리(`/home/ec2-user/{env,scripts,config,docker}`)에 자산을 올리고 prod RDS 스키마를 적용한다.

### Task 3.1: 자산 업로드 + 실 env 작성

- [ ] **Step 1: prod-app 접속 (SSM 권장, SSH 대안)**

Run: `aws ssm start-session --target <flori-prod-app-instance-id> --profile flori.ai --region ap-northeast-2`
(또는 `ssh -i ~/Desktop/aws-infra/flori-key.pem ec2-user@<prod_app_public_ip>`)

- [ ] **Step 2: compose·scripts 업로드**

로컬에서:
```bash
scp -i ~/Desktop/aws-infra/flori-key.pem ~/Desktop/aws-infra/flori-prod-servers/app/docker/docker-compose.yml ec2-user@<prod_app_public_ip>:/home/ec2-user/docker/docker-compose.yml
scp -i ~/Desktop/aws-infra/flori-key.pem ~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.api.sh ~/Desktop/aws-infra/flori-prod-servers/app/scripts/deploy.web.sh ec2-user@<prod_app_public_ip>:/home/ec2-user/scripts/
```
서버에서: `chmod +x /home/ec2-user/scripts/deploy.*.sh`

- [ ] **Step 3: 실 env 파일 작성 (서버에서, 커밋 안 함)**

`.env.api.example`/`.env.web.example` 를 참고해 `/home/ec2-user/env/.env.api`, `/home/ec2-user/env/.env.web` 를 강한 실값(JWT_SECRET, INTERNAL_API_KEY, prod DB_PASSWORD, OAuth prod 키, VAPID)으로 작성. `DB_URL` 의 `<PROD_RDS_ENDPOINT>` 는 실제 endpoint 로 치환. 권한: `chmod 600 /home/ec2-user/env/.env.*`

### Task 3.2: prod RDS 스키마 적용

api `ddl-auto=validate` 라 스키마 선적용 필수. SSOT = `api/docs/sql/all-tables-ddl.sql`(+ `migration/`).

- [ ] **Step 1: prod-app 에서 psql 설치 + RDS 연결 확인**

prod-app 은 prod-rds SG 출처라 RDS 5432 접근 가능. 서버에서:
```bash
sudo dnf install -y postgresql16
PGPASSWORD='<prod_db_password>' psql -h <PROD_RDS_ENDPOINT> -U flori_admin -d flori -c '\conninfo'
```
Expected: 연결 성공 출력.

- [ ] **Step 2: DDL 업로드 + 적용**

로컬에서 DDL 전송:
```bash
scp -i ~/Desktop/aws-infra/flori-key.pem ~/Desktop/flori-ai/api/docs/sql/all-tables-ddl.sql ec2-user@<prod_app_public_ip>:/home/ec2-user/
```
서버에서 적용:
```bash
PGPASSWORD='<prod_db_password>' psql -h <PROD_RDS_ENDPOINT> -U flori_admin -d flori -v ON_ERROR_STOP=1 -f /home/ec2-user/all-tables-ddl.sql
```
Expected: 에러 없이 전체 테이블 생성. `migration/` 디렉터리에 추가 DDL이 있으면 파일명 시간순으로 동일 적용.

- [ ] **Step 3: 테이블 생성 검증**

```bash
PGPASSWORD='<prod_db_password>' psql -h <PROD_RDS_ENDPOINT> -U flori_admin -d flori -c "\dt" | head -40
```
Expected: sales, expenses, customers, reservations 등 핵심 테이블 존재.

> seed 는 prod 라 적용하지 않음(`seed-dev-mock.sql` 등은 dev 전용). prod 는 빈 스키마로 시작.

---

## Phase 4: api prod CICD (flori-api-session2 워크트리)

작업: `cd ~/Desktop/flori-ai/flori-api-session2`

### Task 4.1: deploy-api-prod.yml 생성 + dev 트리거 분리

**Files:**
- Create: `.github/workflows/deploy-api-prod.yml`
- Modify: `.github/workflows/deploy-api-dev.yml` (트리거 `[dev, main]` → `[dev]`)

- [ ] **Step 1: deploy-api-dev.yml 트리거를 dev 전용으로 좁힘**

`on.push.branches` 를 `[dev, main]` → `[dev]` 로 변경(main push 가 prod 로만 가도록):
```yaml
on:
  push:
    branches: [dev]
  workflow_dispatch:
```

- [ ] **Step 2: deploy-api-prod.yml 작성 (dev 워크플로 미러)**

```yaml
# ==============================================================================
# flori api (Spring Boot/Kotlin) CI/CD — PROD
# ==============================================================================
# 흐름: ARM64 네이티브 Docker 빌드(bootJar -x test) → ECR(flori-prod/api) → SSH deploy.api.sh
# 트리거: main push (dev 워크플로는 dev 브랜치 전용으로 분리됨).
# GitHub Environment `prod` secrets:
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  (flori-prod/* push 권한)
#   SSH_HOST (= flori-prod-app EIP) / SSH_USER (ec2-user) / SSH_PRIVATE_KEY (flori-key.pem)
# ==============================================================================

name: 🚀 Deploy api (PROD)

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: flori-prod/api

jobs:
  build-and-push:
    name: 빌드 및 ECR Push
    runs-on: ubuntu-24.04-arm
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4
      - name: AWS 인증 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - name: ECR 로그인
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: 이미지 태그 생성
        id: meta
        run: |
          SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-7)
          TIMESTAMP=$(TZ='Asia/Seoul' date +'%Y%m%d%H%M%S')
          echo "tags=${TIMESTAMP}-${SHORT_SHA}" >> $GITHUB_OUTPUT
      - name: Docker Buildx 설정
        uses: docker/setup-buildx-action@v3
      - name: Docker 이미지 빌드 및 Push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ steps.meta.outputs.tags }}
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest
          platforms: linux/arm64
          provenance: false
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: EC2 배포
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: prod
    steps:
      - name: SSH 배포
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            /home/ec2-user/scripts/deploy.api.sh ${{ needs.build-and-push.outputs.image_tag }}
```

- [ ] **Step 3: 검증 (워크플로 YAML 문법)**

Run: `cd ~/Desktop/flori-ai/flori-api-session2 && python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/deploy-api-prod.yml','.github/workflows/deploy-api-dev.yml']]; print('yaml ok')"`
Expected: `yaml ok`

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/deploy-api-prod.yml .github/workflows/deploy-api-dev.yml
git commit -m "ci(api): prod 배포 워크플로 추가 + dev 트리거 dev 전용 분리

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> build job 의 AWS 자격증명은 `secrets.AWS_ACCESS_KEY_ID`(repo/org 기본)이고 environment 미지정이다(dev 와 동일 패턴). 만약 그 IAM 유저(`flori-gha-ecr`)가 `flori-dev/*` 만 push 가능하도록 스코프돼 있으면 **prod push 가 실패**한다 → Phase 7 Task 7.2 에서 권한 확장 검증.

---

## Phase 5: web prod CICD + ci.yml 정리 (flori-web-session2 워크트리)

작업: `cd ~/Desktop/flori-ai/flori-web-session2`

### Task 5.1: deploy-web-prod.yml + dev 트리거 분리 + ci.yml 죽은 env 제거

**Files:**
- Create: `.github/workflows/deploy-web-prod.yml`
- Modify: `.github/workflows/deploy-web-dev.yml` (트리거 `[dev, main]` → `[dev]`)
- Modify: `.github/workflows/ci.yml` (죽은 Supabase/R2 placeholder 제거)

- [ ] **Step 1: deploy-web-dev.yml 트리거를 dev 전용으로 좁힘**

```yaml
on:
  push:
    branches: [dev]
  workflow_dispatch:
```

- [ ] **Step 2: deploy-web-prod.yml 작성**

```yaml
# ==============================================================================
# flori web (Next.js 16 admin) CI/CD — PROD
# ==============================================================================
# 흐름: ARM64 네이티브 standalone 빌드 → ECR(flori-prod/web) → SSH deploy.web.sh
# 트리거: main push (dev 워크플로는 dev 브랜치 전용으로 분리됨).
# build job 은 environment: prod 로 NEXT_PUBLIC_* build-arg(클라 번들 baked) 를 prod 값으로 주입.
#   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (필수, 비면 빌드 실패)
#   - NEXT_PUBLIC_KAKAO_OPENCHAT_URL / NEXT_PUBLIC_GA_MEASUREMENT_ID / NEXT_PUBLIC_CLARITY_PROJECT_ID (선택)
#   - API_URL 은 런타임(.env.web) 주입이라 build-arg 불필요.
# GitHub Environment `prod` secrets/vars:
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SSH_HOST(prod EIP) / SSH_USER / SSH_PRIVATE_KEY
#   NEXT_PUBLIC_VAPID_PUBLIC_KEY
# ==============================================================================

name: 🚀 Deploy web (PROD)

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

env:
  AWS_REGION: ap-northeast-2
  ECR_REPOSITORY: flori-prod/web

jobs:
  build-and-push:
    name: 빌드 및 ECR Push
    runs-on: ubuntu-24.04-arm
    environment: prod
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - name: 코드 체크아웃
        uses: actions/checkout@v4
      - name: AWS 인증 설정
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      - name: ECR 로그인
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      - name: 이미지 태그 생성
        id: meta
        run: |
          SHORT_SHA=$(echo ${{ github.sha }} | cut -c1-7)
          TIMESTAMP=$(TZ='Asia/Seoul' date +'%Y%m%d%H%M%S')
          echo "tags=${TIMESTAMP}-${SHORT_SHA}" >> $GITHUB_OUTPUT
      - name: Docker Buildx 설정
        uses: docker/setup-buildx-action@v3
      - name: Docker 이미지 빌드 및 Push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ steps.meta.outputs.tags }}
            ${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:latest
          platforms: linux/arm64
          provenance: false
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_VAPID_PUBLIC_KEY=${{ secrets.NEXT_PUBLIC_VAPID_PUBLIC_KEY }}

  deploy:
    name: EC2 배포
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: prod
    steps:
      - name: SSH 배포
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            /home/ec2-user/scripts/deploy.web.sh ${{ needs.build-and-push.outputs.image_tag }}
```

- [ ] **Step 3: ci.yml 에서 죽은 Supabase/R2 placeholder 제거**

`.github/workflows/ci.yml` build step 의 다음 env 라인들을 삭제(코드에서 미사용):
```yaml
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ci-placeholder-service-role-key
          R2_ACCOUNT_ID: ci-placeholder
          R2_ACCESS_KEY_ID: ci-placeholder
          R2_SECRET_ACCESS_KEY: ci-placeholder
          R2_BUCKET_NAME: ci-placeholder
          R2_PUBLIC_URL: https://ci-placeholder.r2.dev
```
대신 빌드 검증에 실제 필요한 값만 남긴다(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `INTERNAL_API_KEY` placeholder 등 — 기존 라인 유지). env.ts 스키마에 Supabase/R2 없음을 재확인했으므로 삭제 안전.

- [ ] **Step 4: 검증**

Run: `cd ~/Desktop/flori-ai/flori-web-session2 && python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['.github/workflows/deploy-web-prod.yml','.github/workflows/deploy-web-dev.yml','.github/workflows/ci.yml']]; print('yaml ok')"`
Expected: `yaml ok`

- [ ] **Step 5: 커밋**

```bash
git add .github/workflows/deploy-web-prod.yml .github/workflows/deploy-web-dev.yml .github/workflows/ci.yml
git commit -m "ci(web): prod 배포 워크플로 추가 + dev 트리거 분리 + ci.yml 죽은 Supabase/R2 env 제거

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: dev RDS 폐기 → dev-app Docker Postgres 전환 (aws-infra, in-place)

> 🔴 순서 고정: **dev Docker PG 기동 → 스키마 적용 → dev api 헬스 OK 확인 → 그 뒤에 dev RDS destroy.** 역순 금지.

### Task 6.1: dev compose 에 postgres 서비스 추가 + DB_URL 전환

**Files:**
- Modify: `~/Desktop/aws-infra/flori-dev-servers/app/docker/docker-compose.yml` (postgres 서비스 추가)
- Modify: `~/Desktop/aws-infra/flori-dev-servers/app/.env.api.example` (DB_URL → 컨테이너)
- 서버: `/home/ec2-user/env/.env.api` DB_URL 갱신 + DDL 적용

- [ ] **Step 1: dev compose 에 postgres 서비스 추가**

`flori-dev-servers/app/docker/docker-compose.yml` 의 `services:` 에 추가(api 가 같은 `app-net` 에서 `postgres` 호스트명으로 접근):

```yaml
  postgres:
    image: postgres:16-alpine
    container_name: flori-dev-pg
    restart: unless-stopped
    environment:
      POSTGRES_DB: flori
      POSTGRES_USER: flori_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    volumes:
      - flori-dev-pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flori_admin -d flori"]
      interval: 10s
      timeout: 5s
      retries: 5
    mem_limit: 512m
    networks:
      - app-net
```
그리고 파일 하단에 named volume 선언 추가:
```yaml
volumes:
  flori-dev-pg-data:
```
api 서비스에 `depends_on: { postgres: { condition: service_healthy } }` 추가(부팅 순서 보장).

- [ ] **Step 2: .env.api(dev) DB_URL 을 컨테이너로 전환**

`.env.api.example` 및 서버 실파일의:
```
DB_URL=jdbc:postgresql://flori-dev-pg.crg0gwu4eyg7.ap-northeast-2.rds.amazonaws.com:5432/flori
```
를:
```
DB_URL=jdbc:postgresql://postgres:5432/flori
DB_USER=flori_admin
DB_PASSWORD=<POSTGRES_PASSWORD 와 동일>
```
로 변경. compose 의 `POSTGRES_PASSWORD` 와 api 의 `DB_PASSWORD` 일치.

- [ ] **Step 3: dev-app 서버에서 postgres 기동 + 스키마 적용 + dev api 재기동**

서버에서:
```bash
cd /home/ec2-user
docker compose -f docker/docker-compose.yml up -d postgres
# 헬스 대기
until docker exec flori-dev-pg pg_isready -U flori_admin -d flori; do sleep 2; done
# DDL 적용 (api/docs/sql/all-tables-ddl.sql 를 서버로 scp 후)
docker exec -i flori-dev-pg psql -U flori_admin -d flori -v ON_ERROR_STOP=1 < /home/ec2-user/all-tables-ddl.sql
# (선택) dev mock seed
# docker exec -i flori-dev-pg psql -U flori_admin -d flori < /home/ec2-user/seed-dev-mock.sql
# api 재기동(새 DB_URL)
/home/ec2-user/scripts/deploy.api.sh latest
```

- [ ] **Step 4: dev api 헬스 확인**

```bash
curl -fsS https://dev-api.flori.ai.kr/actuator/health
```
Expected: `{"status":"UP"}` — Docker PG 로 정상 부팅 확인. **여기까지 OK 여야 다음 단계.**

### Task 6.2: dev RDS Terraform 제거 (destroy)

**Files:**
- Delete: `~/Desktop/aws-infra/flori-ai-tf/rds.tf`
- Modify: `~/Desktop/aws-infra/flori-ai-tf/security_groups.tf` (dev rds SG 블록 제거)
- Modify: `~/Desktop/aws-infra/flori-ai-tf/outputs.tf` (dev rds 관련 output 제거)
- 확인: `iam.tf`/`variables.tf` 의 dev RDS 참조 정리

- [ ] **Step 1: dev RDS 참조 전수 확인**

Run: `cd ~/Desktop/aws-infra/flori-ai-tf && grep -rn "aws_db_instance.this\|aws_db_subnet_group.this\|aws_db_parameter_group.this\|aws_security_group.rds\|secretsmanager" *.tf`
Expected: rds.tf, security_groups.tf(rds SG), outputs.tf 에서만 참조. 목록 확보.

- [ ] **Step 2: dev RDS 리소스 제거**

- `rm ~/Desktop/aws-infra/flori-ai-tf/rds.tf`
- `security_groups.tf` 에서 `aws_security_group.rds` + `aws_vpc_security_group_ingress_rule.rds_from_app` + `rds_from_cidr` + `aws_vpc_security_group_egress_rule.rds_all` 블록 삭제
- `outputs.tf` 에서 dev rds 관련 output(endpoint/address/port/db_name/password_secret_arn) 삭제

- [ ] **Step 3: plan 으로 destroy 범위 확인**

Run: `terraform plan`
Expected: destroy 대상 = `aws_db_instance.this`, `aws_db_subnet_group.this`, `aws_db_parameter_group.this`, dev `aws_security_group.rds` (+ 규칙). **prod RDS·dev EC2·prod 리소스는 변경 0.** (Secrets Manager 리소스는 count=0 이라 무관.)

> dev RDS `deletion_protection=false`, `skip_final_snapshot=true` 라 즉시 삭제 가능.

- [ ] **Step 4: apply (dev RDS 폐기)**

Run: `export TF_VAR_db_password='<dev기존값>' TF_VAR_prod_db_password='<prod비번>' && terraform apply`
Expected: dev RDS 일체 삭제. apply 후 `terraform plan` = no changes.

- [ ] **Step 5: aws-infra main 커밋·푸시**

```bash
cd ~/Desktop/aws-infra
git add flori-ai-tf/security_groups.tf flori-ai-tf/outputs.tf flori-dev-servers/app/docker/docker-compose.yml flori-dev-servers/app/.env.api.example
git rm flori-ai-tf/rds.tf
git commit -m "refactor(flori): dev RDS 폐기 → dev-app Docker Postgres 전환

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## Phase 7: GitHub Environment prod 시크릿 + ECR 권한 (수동, 사용자)

> 이 단계는 GitHub UI/콘솔 작업이라 사용자(또는 인증된 `gh`)가 수행. 값은 Phase 1 출력·서버 실값과 일치시킨다.

### Task 7.1: GitHub `prod` Environment 생성 + 시크릿 (web·api 리포 각각)

- [ ] **Step 1: api 리포(`flori-ai-kr/api`) `prod` Environment 시크릿**

`gh secret set --env prod --repo <org>/api` 로 설정(또는 GitHub UI):
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (flori-prod/* push 가능 IAM)
- `SSH_HOST` = `<prod_app_public_ip>` (Phase 1 출력)
- `SSH_USER` = `ec2-user`
- `SSH_PRIVATE_KEY` = `flori-key.pem` 내용

- [ ] **Step 2: web 리포(`flori-ai-kr/web`) `prod` Environment 시크릿**

위 5개 + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`(dev 와 동일 키페어 — api 의 VAPID_PUBLIC_KEY 와 일치).

### Task 7.2: ECR push IAM 권한 prod 확장 검증

- [ ] **Step 1: GHA IAM 유저 정책 확인**

Run: `aws iam list-attached-user-policies --user-name flori-gha-ecr --profile flori.ai` 및 inline `aws iam list-user-policies --user-name flori-gha-ecr --profile flori.ai` → 정책 문서에서 ECR push Resource 가 `flori-dev/*` 한정인지 account-wide(`*`)인지 확인.

- [ ] **Step 2: 필요 시 prod 리포 push 권한 추가**

`flori-dev/*` 한정이면 정책에 `flori-prod/api`·`flori-prod/web` 리포 ARN 의 push 액션(`ecr:PutImage`, `UploadLayerPart`, `InitiateLayerUpload`, `CompleteLayerUpload`, `BatchCheckLayerAvailability`, `GetAuthorizationToken`) 추가. account-wide 면 조치 불필요.

---

## Phase 8: 배포 트리거 + 엔드투엔드 검증

### Task 8.1: prod 첫 배포 (main 머지)

- [ ] **Step 1: api/web session2 PR → dev 머지 (`/feature-finalize`)**

각 워크트리에서 `/feature-finalize` 로 PR → dev. (워크플로 파일이 dev 에 들어가야 main 머지 시 동작.)

- [ ] **Step 2: dev → main 승격**

dev 가 안정화되면 `main` 으로 머지/승격 → `deploy-api-prod.yml`·`deploy-web-prod.yml` 가 main push 로 발동 → 이미지 빌드 → `flori-prod/*` push → `flori-prod-app` 배포.

- [ ] **Step 3: GitHub Actions 로그 확인**

Run: `gh run list --repo <org>/api --workflow "Deploy api (PROD)" --limit 3` 및 web 동일. 빌드·SSH deploy 성공 확인.

### Task 8.2: 도메인별 헬스 검증

- [ ] **Step 1: 전 도메인 curl**

```bash
curl -fsS https://dev-api.flori.ai.kr/actuator/health   # dev api {"status":"UP"}
curl -fsS -o /dev/null -w "%{http_code}\n" https://dev-admin.flori.ai.kr/   # dev web 200/3xx
curl -fsS https://api.flori.ai.kr/actuator/health        # prod api {"status":"UP"}
curl -fsS -o /dev/null -w "%{http_code}\n" https://admin.flori.ai.kr/        # prod web 200/3xx
curl -fsS -o /dev/null -w "%{http_code}\n" https://flori.ai.kr/              # homepage 200 (변경 없음)
curl -fsS -o /dev/null -w "%{http_code}\n" https://dev-ai.flori.ai.kr/health # ai 공유 200
```
Expected: 모두 정상. prod api/web 이 새 인스턴스에서 응답.

- [ ] **Step 2: prod 스모크 — 소셜 로그인 콜백·CORS**

브라우저로 `https://admin.flori.ai.kr` 접속 → 미로그인 시 로그인 화면. 소셜 로그인 1종 시도(OAuth prod 콜백 등록 `https://api.flori.ai.kr/auth/...` 필요). web→api CORS(`CORS_ALLOWED_ORIGINS=https://admin.flori.ai.kr`) 통과 확인(콘솔 CORS 에러 없음).

- [ ] **Step 3: prod Swagger 비활성 확인**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://api.flori.ai.kr/swagger-ui.html`
Expected: 404/403 (SPRINGDOC_*_ENABLED=false).

---

## Self-Review (작성자 체크 결과)

- **도메인 매핑**: dev-admin/dev-api·admin/api·apex 전부 Phase 1(ALB rule/route53) + Phase 8 검증에 커버 ✓
- **prod EC2/RDS 프로비저닝**: Phase 1 Task 1.5/1.6 ✓
- **dev RDS 폐기 + Docker PG**: Phase 6 (순서 안전장치 포함) ✓
- **prod CICD api/web**: Phase 4/5 + Environment prod Phase 7 ✓
- **스키마 선적용(validate)**: prod=Phase 3.2, dev=Phase 6.1 둘 다 포함 ✓
- **트리거 중복(dev,main)**: dev→dev전용, prod→main 분리 (Phase 4.1/5.1) ✓
- **ci.yml 죽은 env**: Phase 5.1 Step 3 ✓
- **타입/이름 일관성**: `local.prod_name_prefix`(prod-ecr.tf 정의) 를 prod-iam/sg/ec2/rds/alb 에서 일관 사용; `aws_ecr_repository.prod_api/prod_web`, `aws_instance.prod_app`, `aws_db_instance.prod`, `aws_security_group.prod_app/prod_rds` 이름 교차 일치 ✓
- **미해결 가정(실행 전 확인 필요)**:
  1. `flori-gha-ecr` IAM push 스코프 → Phase 7.2 에서 검증
  2. dev compose 의 실제 `${ECR_REGISTRY}`/healthcheck 표기 → prod 복제 시 dev 원본 보존(Phase 2 Step 2)
  3. S3 이미지 버킷 dev/prod 공유 결정 → Task 1.3 NOTE (추후 분리 가능)
  4. OAuth prod 앱 키·콜백 등록은 외부(카카오/구글/네이버 콘솔) 작업 → Phase 8.2 전 사용자 준비
