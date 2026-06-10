# 세션3: 고객·사진첩 리디자인 + 사진↔고객 매핑 + 커스텀 등급 (설계)

> 작성일 2026-06-08 · 브랜치 `feature/session3-gallery` (web·api 공통) · 기준 `dev`
> 워크트리: web `../flori-web-session3` (3300포트) / api `../flori-api-session3`

## 1. 목표

고객·사진첩 두 화면을 **비주얼 + IA/기능** 모두 개편한다. 세 가지 기능 묶음:

1. **사진 ↔ 고객 매핑** — 사진카드를 고객에 직접 연결(soft 참조), 양방향 탐색
2. **커스텀 고객 등급** — 고정 enum(`new/regular/vip/blacklist`) → 테넌트별 커스텀 등급 + 구매횟수 자동승급 + 수동 고정
3. **UI 리스킨** — #78 매출·지출 cool 팔레트/카드뷰/FAB 패턴으로 통일

비범위(out of scope): 랜딩페이지·사용설명서·처리방침(세션3 후반 별도 작업).

## 2. 확정된 결정 (브레인스토밍)

| 주제 | 결정 |
|------|------|
| 사진↔고객 링크 | `photo_cards.customer_id` **직접 컬럼**, **하드 FK 아님**(soft 참조), nullable. 연결은 **선택사항** |
| 양방향 탐색 | 사진 상세 → 고객 상세로 점프 / 고객 카드·상세 → 연결 사진 썸네일 + 사진첩(해당 고객 필터) 이동 |
| 등급 | 테넌트별 **커스텀**(색 없음), 각 등급에 **구매횟수 임계값(선택)** |
| 자동승급 | 구매횟수가 임계값 도달 시 자동 승급 |
| 수동 고정 (규칙 A) | 손으로 등급 지정하면 그 고객은 **"고정"** — 자동이 안 건드림. 고객 상세에서 "자동 등급으로 되돌리기"로 해제 |
| 블랙리스트 | 임계값 없는 **수동 전용** 등급(자동승급 대상 아님) |
| 고객 목록 | 전체 보기 시 **등급 그룹핑 제거 → 통합 그리드**, 정렬에 **최근 구매순** 추가 |
| FAB | 고객/사진첩 모두 매출·지출식 **speed-dial**. 고객: 등록·내보내기·등급관리 / 사진첩: 카드추가·태그관리 |
| 태그 | 기존 그대로(색상 유지), 진입만 FAB로 |
| 디자인 워크플로 | HTML 시안(`docs/_tmp/session3-redesign.html`)으로 합의 → 코드 |

## 3. 아키텍처 원칙 (기존 답습)

- **데이터 경로**: web Server Action → `apiFetch` → Kotlin BFF REST. web은 DB·`user_id` 직접 안 다룸
- **소프트 참조**: FK 없음, 참조 정합성은 서비스 레이어가 책임 (`clearCustomerReference` 식)
- **통계 SSOT**: 고객 구매통계(횟수/금액/일자)는 저장 안 하고 sales에서 실시간 집계
- **멀티테넌시**: 모든 쿼리 `TenantContext.currentUserId()` 필터
- **마이그레이션**: `docs/sql/migration/YY-MM-DD-*.sql`(idempotent, BEGIN/COMMIT) + `all-tables-ddl.sql` SSOT 갱신, `ddl-auto: validate`

---

## 4. 기능 1: 사진 ↔ 고객 매핑

### 4.1 데이터 모델 (api)
- `PhotoCard` 엔티티에 `customerId: Long?` 추가 (기존 `saleId` 패턴 그대로 — 컬럼만, FK 없음)
- 마이그레이션 `26-06-08-photo-cards-add-customer-id.sql`:
  - `ALTER TABLE photo_cards ADD COLUMN IF NOT EXISTS customer_id BIGINT;`
  - 인덱스 `CREATE INDEX IF NOT EXISTS idx_photo_cards_customer ON photo_cards(user_id, customer_id);`
  - **백필**: 기존 사진카드 중 `sale_id`가 있는 것은 해당 sale의 `customer_id`로 1회 채움
    `UPDATE photo_cards pc SET customer_id = s.customer_id FROM sales s WHERE pc.sale_id = s.id AND pc.customer_id IS NULL AND s.customer_id IS NOT NULL;`
- `all-tables-ddl.sql` photo_cards 섹션 갱신

### 4.2 API 계약 변경 (api)
- `PhotoCardCreateRequest` / `PhotoCardUpdateRequest`: `customerId: Long?` 추가
- `PhotoCardResponse`: `customerId: Long?` + 편의상 `customerName: String?`(연결 고객명, 배지 표시용) 추가
- `PhotoCardService`: `verifyCustomerOwnership(customerId)` 추가(기존 `verifySaleOwnership` 패턴), create/update 시 검증
- `GET /photo-cards?customerId=` 필터: 기존 sales LEFT JOIN 방식 → **직접 `pc.customer_id = :customerId`** 필터로 교체 (백필 후 join 불필요)
- 고객 삭제 시 `clearCustomerReference` 추가 (photo_cards.customer_id 도 null 처리)

### 4.3 web 변경
- `types/database.ts` `PhotoCard`에 `customer_id?: string | null`, `customer_name?: string | null` 추가
- `lib/actions/photo-cards.ts`: create/update 액션이 `customer_id` 전달, `getPhotoCards` customerId 직접 필터(이미 시그니처 존재)
- **사진카드 작성/편집 모달**(`PhotoUploadModal`): "고객 연결(선택)" 검색 선택기 추가 — 매출의 `CustomerAutocomplete`(`components/sales/`) 재사용
- **사진 상세**(`PhotoCardDialog`): 연결 고객 배지(`👤 이름`) → 클릭 시 고객 상세로 이동. 기존 매출 링크와 공존
- **사진첩 카드**(`PhotoCard.tsx`): 고객 연결 배지 표시(없으면 미표시)

---

## 5. 기능 2: 커스텀 등급 + 자동승급 + 수동 고정

### 5.1 데이터 모델 (api)
**신규 테이블 `customer_grades`** (테넌트별 등급 정의):
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | |
| user_id | BIGINT NOT NULL | 테넌트 |
| name | VARCHAR(50) NOT NULL | 등급명 (예: 단골) — 색 없음 |
| threshold | INT NULL | 구매횟수 임계값. NULL = 수동 전용(자동승급 대상 아님) |
| sort_order | INT NOT NULL | 표시 순서 |
- UNIQUE `(user_id, name)`

**`customers` 엔티티 변경**:
- `grade_id: Long?` 추가 (soft 참조 → customer_grades.id)
- `grade_locked: Boolean DEFAULT false` 추가 (규칙 A: true면 자동승급이 안 건드림)
- 기존 `grade VARCHAR` 컬럼 **즉시 제거** (D3 확정 — live 배포 전이라 보존 불필요)

**기본 등급 시드 정책**: 테넌트 가입 시(또는 최초 접근 시 lazy) 기본 등급 4종 자동 생성 — **신규(0) / 단골(5) / VIP(10) / 블랙리스트(수동전용·threshold NULL)** (D1 확정 임계값 0/5/10)

**마이그레이션 `26-06-08-customer-custom-grades.sql`**:
1. `customer_grades` 테이블 생성
2. **기존 테넌트별 기본 등급 시드**: customers의 distinct user_id마다 (신규,0)/(단골,5)/(VIP,10)/(블랙리스트,NULL) 4행 삽입
3. **grade_id 백필**: 기존 `customers.grade` 문자열 → 시드 등급 매핑 (`new→신규, regular→단골, vip→VIP, blacklist→블랙리스트`)
4. **grade_locked 설정 (D1 확정)**: `blacklist` 였던 고객만 `grade_locked = true`. 나머지(new/regular/vip)는 `grade_locked = false` → 배포 후 구매횟수 기준 자동 재계산 (live 전이라 서프라이즈 무관)
5. `customers.grade` 컬럼 DROP
6. `all-tables-ddl.sql` 갱신

### 5.2 자동승급 / 수동 고정 로직 (api)
- **기본 등급 결정**: 고객 구매횟수 `n` → `customer_grades` 중 `threshold IS NOT NULL AND threshold <= n` 인 등급들 중 **threshold 최대** 등급. 없으면 threshold 최소(=신규).
- **트리거**: `SaleService.create/update/delete` 에서 해당 customer의 매출 변동 후 `CustomerService.recomputeGradeIfAuto(customerId)` 호출
  - `grade_locked == true` → 스킵
  - `grade_locked == false` → 위 규칙으로 grade_id 재계산·저장
  - 구매횟수는 저장 안 하므로 `statsFor()` 로 재계산
- **수동 지정**(규칙 A): `PATCH /customers/{id}/grade { gradeId }` 또는 고객 폼에서 특정 등급 선택 → `grade_id` 설정 + `grade_locked = true`
- **자동 되돌리기**: `PATCH /customers/{id}/grade/auto` (또는 `{ gradeId: null }`) → `grade_locked = false` + 즉시 재계산
- **등급 삭제 시**: 그 등급을 쓰던 고객은 재계산(자동) 또는 신규로 강등. 삭제 가드: 마지막 1개 등급은 삭제 불가

### 5.3 등급 CRUD API (api)
- `GET /customer-grades` — 목록(sort_order)
- `POST /customer-grades { name, threshold? }`
- `PATCH /customer-grades/{id} { name?, threshold?, sortOrder? }`
- `DELETE /customer-grades/{id}`
- (설정 모듈 패턴 = 기존 label-settings/`SalesSettingsModal` 참고)

### 5.4 API 응답 계약 (api)
- `CustomerResponse`: `grade`(등급명 문자열, 배지 표시용) 유지 + `gradeId: Long`, `gradeLocked: Boolean` 추가
- 백워드 호환: web 배지는 `grade` 문자열을 그대로 표시(커스텀명 OK)

### 5.5 web 변경
- `types/database.ts`: `CustomerGrade` enum 제거(또는 `string` 완화), `Customer`에 `grade_id`, `grade_locked` 추가. 신규 `CustomerGradeConfig { id, name, threshold, sort_order }`
- `lib/actions/customer-grades.ts` 신규: 등급 CRUD 액션
- `lib/actions/customers.ts`: `updateCustomerGrade(id, gradeId)` → 수동 고정, `revertCustomerGradeAuto(id)` 신규
- **등급 관리 모달** 신규(`customers/components/CustomerGradesModal.tsx`): 등급 목록(이름 + 임계값 또는 "수동 전용") + 추가/편집/삭제 + 드래그 정렬. FAB "등급 관리"에서 진입
- **고객 폼**(`CustomerFormDialog`): 등급 선택 = `자동(구매횟수 기준)` 기본 + 특정 등급 선택(=고정). 색 picker 없음
- **고객 상세**(`CustomerDetailDialog`): 등급 배지 + `grade_locked`면 🔒 표시 + "자동 등급으로 되돌리기" 액션
- **고객 목록**: 등급 필터는 `customer_grades` 동적 조회로 채움(고정 4개 하드코딩 제거)

---

## 6. 기능 3: UI 리디자인 (비주얼 + IA)

시안: `docs/_tmp/session3-redesign.html` (7화면 탭). cool 팔레트(`--brand #A85475` 등), `DomainBadge`·공용 `date-picker` 등 기존 시스템 사용.

### 6.1 고객 목록 (`customers-client.tsx`)
- 전체 보기 = **등급 그룹핑 제거**, 통합 그리드(최근 구매순 기본)
- 정렬 옵션에 **최근 구매순**(`last_purchase_date desc`) 추가 — 기존: 최신등록/가나다/구매횟수/구매금액
- 상단 액션 버튼 제거 → **FAB speed-dial**(고객등록 / 내보내기 / 등급관리)
- **고객 카드**(`CustomerCard`): 하단에 연결 사진 썸네일 3장 미리보기 + "사진 N →"(없으면 "연결된 사진 없음"). 클릭 → `/admin/gallery?customer=<id>`
  - **(D2 확정)** BFF 고객 목록 응답에 `photoThumbnails: string[]`(대표 3장) + `photoCount: Int` 포함. N+1 없이 한 번에 집계(고객별 photo_cards LATERAL/그룹 조회)

### 6.2 고객 상세 (`CustomerDetailDialog`)
- 통계 그리드 아래 **연결 사진 썸네일 가로 스크롤** + "사진첩에서 보기 →"(`?customer=<id>`)
- 하단 액션 = 매출등록 / 수정 / 삭제 (기존 "사진첩에서 보기" 버튼 **제거**, 위 링크로 일원화)
- 등급 🔒/되돌리기 UI(5.5)

### 6.3 사진첩 (`gallery-client.tsx`)
- 상단 버튼 제거 → **FAB speed-dial**(새 카드 추가 / 태그 관리)
- 카드 고객 배지(4.3), 고객 필터 customer_id 직접

### 6.4 사진 상세·작성 (`PhotoCardDialog`, `PhotoUploadModal`)
- 4.3 참조 (고객 배지·이동 / 고객 연결 선택기)

---

## 7. 작업 분리 & 순서

**api 먼저(web 의존)** → web.

### api (`../flori-api-session3`)
1. 마이그레이션 2종 작성 + RDS 적용(사전 허락 필요) + `all-tables-ddl.sql` 갱신
2. `customer_grades` 모듈(엔티티/리포/서비스/컨트롤러/DTO)
3. `Customer` 엔티티 grade_id·grade_locked + 등급 재계산 로직 + SaleService 훅
4. `PhotoCard` customer_id + DTO·서비스·필터·소유검증
5. 응답 DTO 확장(grade/gradeId/gradeLocked, photoThumbnails/photoCount, photoCard.customerName)
6. 테스트(docs/service/integration) + REST Docs

### web (`../flori-web-session3`)
1. 타입·액션 계약 갱신
2. 등급 관리 모달 + 고객 폼/상세 등급 UI
3. 고객 목록 리스킨(통합 그리드·정렬·FAB·썸네일)
4. 사진첩 리스킨(FAB·고객 배지·필터) + 사진 모달 고객 선택기/배지
5. 시안 대조 + lint + 테스트

**PR**: 각 레포 `feature/session3-gallery` 브랜치로 `/feature-finalize`. api → web 순 머지.

## 8. 확정된 결정 & 리스크

- **D1 ✅**: 기본 등급 임계값 **0/5/10**(신규/단골/VIP) + 블랙리스트(수동). 마이그레이션 시 **블랙리스트만 잠금**, 나머지 자동 재계산 (live 전)
- **D2 ✅**: 고객 목록 응답에 **대표 썸네일 3장 + 카운트** 포함
- **D3 ✅**: `customers.grade` VARCHAR **즉시 제거**(live 전)
- **R1**: 자동승급이 매출 대량 변경(삭제/마이그레이션) 시 N회 재계산 — 배치 경로는 스킵/일괄 재계산 고려
- **R2**: 사진첩 customerId 필터를 직접 컬럼으로 바꾸면 백필 누락분 누락 가능 → 마이그레이션 백필 검증

## 9. 테스트 관점

- api: 자동승급(임계값 경계 n-1/n/n+1), 수동 고정 후 매출 추가 시 불변, 되돌리기 후 재계산, 등급 삭제 가드, photo_card customer 소유검증/필터, 백필 정확성
- web: 고객 폼 자동/특정 등급, 상세 🔒/되돌리기, 사진 연결/해제, 사진첩 고객 필터, 빈 상태
