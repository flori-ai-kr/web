# Vercel 배포 가이드

Next.js 16 + Supabase 프로젝트를 Vercel Free (Hobby) Plan으로 배포하는 절차.

---

## 1. 사전 준비

### 필요 계정
- GitHub 계정 (레포지토리 연동용)
- Vercel 계정 (GitHub으로 가입 권장)
- Supabase 프로젝트 (이미 생성됨)

### 환경변수 확인
`.env.local`에 아래 값이 있는지 확인:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 2. Vercel 배포

### Step 1: Vercel 가입 + 프로젝트 생성
1. [vercel.com](https://vercel.com) 접속 -> GitHub 계정으로 가입/로그인
2. "Add New Project" 클릭
3. GitHub 저장소 `bbbang105/flowershop-admin` 선택
4. Framework Preset: **Next.js** (자동 감지됨)
5. Root Directory: `./` (기본값 유지)

### Step 2: 환경변수 설정
Vercel 프로젝트 Settings > Environment Variables 탭에서 추가:

| Key | Value | Environments |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |

### Step 3: 배포
- "Deploy" 버튼 클릭
- 빌드 완료되면 URL 생성됨: `https://flowershop-admin-xxx.vercel.app`

### Step 4: Supabase 콜백 URL 설정
Supabase Dashboard > Authentication > URL Configuration:

| 항목 | 값 |
|------|-----|
| Site URL | `https://flowershop-admin-xxx.vercel.app` |
| Redirect URLs | `https://flowershop-admin-xxx.vercel.app/**` |

---

## 3. 커스텀 도메인 연결 (선택)

1. Vercel Dashboard > Settings > Domains
2. 도메인 입력 (예: `admin.hazel-flower.com`)
3. DNS 레코드 추가:
   - **A 레코드**: `76.76.21.21`
   - 또는 **CNAME**: `cname.vercel-dns.com`
4. HTTPS 인증서 자동 발급 (Let's Encrypt)
5. Supabase의 Site URL / Redirect URLs도 커스텀 도메인으로 업데이트

---

## 4. 자동 배포 설정

GitHub 연동 후 자동으로 아래가 동작함:
- `main` (또는 `dev`) 브랜치 push -> **Production 배포**
- `feature/*` 브랜치 push -> **Preview 배포** (별도 URL 생성)
- PR 생성 시 -> Preview URL이 PR 코멘트에 자동 첨부

### Production Branch 변경
Settings > Git > Production Branch에서 `main` 또는 `dev`로 설정 가능.

---

## 5. 배포 후 확인사항

- [ ] 로그인 페이지 접속 가능한지 확인
- [ ] Supabase Auth 로그인/로그아웃 동작 확인
- [ ] 매출/지출/고객 CRUD 동작 확인
- [ ] 이미지 업로드 + Supabase Storage 이미지 표시 확인
- [ ] 다크모드 토글 동작 확인
- [ ] 모바일 반응형 확인

---

## 6. 비용

### Free Hobby Plan 한도 (1~2명 어드민 사용 시 충분)

| 항목 | 한도 | 예상 사용량 |
|------|------|------------|
| Bandwidth | 100GB/월 | ~1GB/월 |
| Serverless Functions | 150K 호출/월 | ~1K/월 |
| Build Minutes | 6,000분/월 | ~50분/월 |
| Image Optimization | 1,000개/월 | ~100개/월 |

### 한도 초과 시
- 자동 과금됨 (사이트 정지 아님)
- Bandwidth: $20/100GB 추가
- Functions: $4/100K 호출 추가

### Pro Plan 전환 시 ($20/월)
- 상업용 사용 시 필요 (Hobby는 비상업용)
- 1TB bandwidth, 분석 대시보드, 팀 기능 추가

---

## 7. 트러블슈팅

### 빌드 실패 시
```bash
# 로컬에서 빌드 테스트
npm run build
```
- `next.config.ts`의 환경변수가 Vercel에 설정되어 있는지 확인
- `NEXT_PUBLIC_SUPABASE_URL` 미설정 시 빌드 에러 발생

### 이미지 안 보일 때
- `next.config.ts`의 `images.remotePatterns`에 Supabase 호스트네임이 포함되어 있는지 확인
- Supabase Storage 버킷이 public인지 확인

### Auth 리다이렉트 안 될 때
- Supabase의 Redirect URLs에 Vercel 도메인이 등록되어 있는지 확인
- `https://` 프로토콜 포함 필수

### Server Actions 타임아웃
- Vercel Free Plan: 함수 실행 시간 최대 60초 (Fluid Compute)
- 대용량 이미지 업로드 시 타임아웃 가능 -> 클라이언트 측 압축으로 해결 (이미 구현됨)
