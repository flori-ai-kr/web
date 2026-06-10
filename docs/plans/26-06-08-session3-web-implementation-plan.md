# 세션3 WEB 구현 계획 (고객·사진첩 리디자인 + 매핑 + 커스텀 등급)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 으로 task 단위 실행. 체크박스로 추적.

**Goal:** api 세션3 변경(사진↔고객 직접연결, 커스텀 등급/자동승급)에 맞춰 web 고객·사진첩 화면을 비주얼+IA 개편한다.

**Architecture:** Server Action(`apiFetch`) → Kotlin BFF. page(server)→client 분리 유지. cool 팔레트(#78), 공용 컴포넌트(DatePicker/DomainBadge/CustomerAutocomplete) 재사용. 시각 가이드: `docs/_tmp/session3-redesign.html`.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Tailwind v4, shadcn/ui, Zod, Vitest.

**기준 spec:** `docs/plans/26-06-08-session3-customer-gallery-redesign.md`
**워크트리:** `/Users/hansangho/Desktop/flori-ai/flori-web-session3` (dev 3300포트, S3 CORS 허용됨)

## 확정 api 계약 (호출 대상)
- `GET /customer-grades` → `[{id, name, threshold|null, sortOrder}]`
- `POST /customer-grades` `{name, threshold?}` · `PATCH /customer-grades/{id}` `{name?, threshold?, sortOrder?, clearThreshold?}` · `DELETE /customer-grades/{id}`
- `PATCH /customers/{id}/grade` `{gradeId}` → 수동 고정 · `PATCH /customers/{id}/grade/auto` → 자동 되돌리기
- `CustomerResponse` 신규 필드: `gradeId:number|null`, `grade:string|null`(등급명), `gradeLocked:boolean`, `photoThumbnails:string[]`, `photoCount:number`. create/update 요청에서 `grade` 제거됨
- `PhotoCardResponse` 신규: `customerId:number|null`, `customerName:string|null`. create/update 요청 `customerId?`, update `clearCustomer?:boolean`
- `GET /photo-cards?customerId=` 는 customer_id 직접 필터(이미 시그니처 존재)

> id 계약: 기존 web은 BFF id를 string으로 다룸(#76 id 기반 마이그레이션). 등급 id도 동일하게 문자열/숫자 변환은 기존 패턴 따름.

---

## 파일 구조

**신규**
- `src/lib/actions/customer-grades.ts` — 등급 CRUD 서버 액션
- `src/app/(admin)/admin/customers/components/CustomerGradesModal.tsx` — 등급 관리 모달

**수정**
- `src/types/database.ts` — Customer/PhotoCard 필드, CustomerGradeConfig, CustomerGrade enum 정리
- `src/lib/actions/customers.ts` — grade 수동/되돌리기 액션, 정렬(최근구매순), create/update grade 제거
- `src/lib/actions/photo-cards.ts` — create/update customer_id 전달
- `src/app/(admin)/admin/customers/customers-client.tsx` — 통합 그리드, 정렬, FAB
- `src/app/(admin)/admin/customers/components/CustomerCard.tsx` — 썸네일/카운트
- `src/app/(admin)/admin/customers/components/CustomerDetailDialog.tsx` — 사진 스트립+링크, 등급 잠금/되돌리기, 하단버튼 정리
- `src/app/(admin)/admin/customers/components/CustomerFormDialog.tsx` — 등급 자동/특정 선택
- `src/app/(admin)/admin/customers/page.tsx` — 등급 목록 prefetch 전달(필요 시)
- `src/app/(admin)/admin/gallery/gallery-client.tsx` — FAB, 고객 배지/필터
- `src/components/gallery/PhotoCard.tsx` — 고객 배지
- `src/components/gallery/PhotoCardDialog.tsx` — 고객 배지 → 고객 상세 이동
- `src/components/gallery/PhotoUploadModal.tsx` — 고객 연결 선택기

---

## Task W1: 타입 + 서버 액션 (foundation)

**Files:** `types/database.ts`, `lib/actions/customer-grades.ts`(생성), `lib/actions/customers.ts`, `lib/actions/photo-cards.ts`

- [ ] **Step 1: types/database.ts**
  - `Customer`: `grade: string | null`(등급명), `grade_id: string | null`, `grade_locked: boolean`, `photo_thumbnails: string[]`, `photo_count: number` 추가. 기존 `CustomerGrade` 리터럴 enum 의존 제거(필드를 string으로). `grade` 비교하던 곳 컴파일 확인.
  - 신규 `CustomerGradeConfig { id: string; name: string; threshold: number | null; sort_order: number }`
  - `PhotoCard`: `customer_id: string | null`, `customer_name: string | null` 추가
- [ ] **Step 2: lib/actions/customer-grades.ts** — `'use server'` + `withErrorLogging` 패턴(기존 액션 답습, 직접 import). `getCustomerGrades()`, `createCustomerGrade(formData|args)`, `updateCustomerGrade(id, ...)`, `deleteCustomerGrade(id)`. BFF `/customer-grades` 매핑. 응답 snake/camel 변환은 기존 매퍼 컨벤션 따름.
  - ⚠️ 이름충돌 주의: customers.ts 에 기존 `updateCustomerGrade(id, grade)` 존재 → 등급 관리용은 `updateCustomerGradeConfig` 등으로 명명, 고객 등급지정용은 아래 W에서 별도.
- [ ] **Step 3: lib/actions/customers.ts**
  - `assignCustomerGrade(customerId, gradeId)` → `PATCH /customers/{id}/grade {gradeId}` (수동 고정)
  - `revertCustomerGradeAuto(customerId)` → `PATCH /customers/{id}/grade/auto`
  - 기존 `updateCustomerGrade(id, grade:string)` 제거/대체. create·update 액션에서 `grade` 필드 제거.
  - 정렬: 클라이언트 정렬 옵션에 '최근 구매순'(`last_purchase_date desc`) 추가(서버 정렬이면 파라미터, 현재 클라 정렬이면 비교함수 추가).
- [ ] **Step 4: lib/actions/photo-cards.ts** — create/update 액션 FormData/args 에 `customer_id`(빈값이면 미전송/clearCustomer) 전달. `getPhotoCards`는 customerId 직접 필터 그대로.
- [ ] **Step 5:** `npm run lint` 통과 + 타입 에러 0 (`npx tsc --noEmit` 가능하면).
- [ ] **Step 6: 커밋** `feat(web): 세션3 타입·서버액션(등급 CRUD/지정, 사진 customer_id)`

---

## Task W2: 등급 관리 모달 (CustomerGradesModal)

**Files:** `customers/components/CustomerGradesModal.tsx`(생성)

- [ ] 시안 S6(`session3-redesign.html` 등급 관리) 형태: 등급 목록(이름 + "N회 이상" 또는 "수동 전용") + 추가/이름·임계값 편집/삭제 + 정렬(드래그 또는 ▲▼). 색 없음.
- [ ] 안내 문구(시안 그대로): 평소 자동 / 손으로 정하면 고정 / 되돌리기 가능.
- [ ] 추가 폼: 이름 + 구매횟수 체크(해제 시 수동전용=threshold null → `clearThreshold` 또는 미전송).
- [ ] 삭제 시 확인(Dialog, `confirm()` 금지 — UI 컨벤션). 마지막 1개 삭제 BFF가 막음 → 에러 토스트.
- [ ] 액션은 W1의 customer-grades 액션 사용. 저장 후 목록 갱신(router.refresh 또는 로컬 state).
- [ ] UI 컨벤션 준수: 한국어, 엔터 제출 방지, 접근성 속성, `transition-all` 금지.
- [ ] 커밋 `feat(web): 고객 등급 관리 모달`

---

## Task W3: 고객 목록 리스킨 (customers-client + CustomerCard)

**Files:** `customers-client.tsx`, `components/CustomerCard.tsx`, `customers/page.tsx`

- [ ] **통합 그리드**: 전체 보기에서 등급별 그룹 섹션 제거 → 단일 반응형 그리드(1/2/3열). 등급 필터 적용 시도 동일 그리드.
- [ ] **등급 필터**: 하드코딩 4개 제거 → `getCustomerGrades()` 동적 목록으로 칩 구성(+'전체'). page.tsx에서 prefetch해 내려도 됨.
- [ ] **정렬**: '최근 구매순' 추가(기본값으로). 옵션: 최근구매순/최신등록/가나다/구매횟수/구매금액.
- [ ] **FAB speed-dial**(매출/지출 `sales-client.tsx` FAB 패턴 복제): 닫힘=+ / 열림 액션 = 고객 등록 · 내보내기 · 등급 관리(→ CustomerGradesModal). 상단 액션 버튼 제거.
- [ ] **CustomerCard**: 하단에 `photo_thumbnails`(≤3) 미리보기 + `photo_count`(`사진 N →`), 없으면 "연결된 사진 없음". 클릭 → `/admin/gallery?customer=<id>`. 등급 배지는 `grade`(이름) 표시, `grade_locked`면 🔒 작게.
- [ ] 커밋 `feat(web): 고객 목록 통합 그리드·최근구매순·FAB·사진 미리보기`

---

## Task W4: 고객 상세 (CustomerDetailDialog)

**Files:** `components/CustomerDetailDialog.tsx`

- [ ] 통계 그리드 아래 **연결 사진 썸네일 가로 스크롤**(`photo_thumbnails`/`photo_count`) + "사진첩에서 보기 →"(`/admin/gallery?customer=<id>`). 썸네일 클릭도 동일 이동.
- [ ] **하단 액션 정리**: 기존 "사진 보기" 버튼 제거 → 매출 등록 / 수정 / 삭제 3개만.
- [ ] **등급 표시**: `grade`(이름) 배지. `grade_locked` 면 🔒 + "자동 등급으로 되돌리기"(→ `revertCustomerGradeAuto`). 등급 수동 변경 UI는 폼(W5)에 두므로 상세에선 표시+되돌리기만.
- [ ] 구매이력 무한스크롤 기존 유지.
- [ ] 커밋 `feat(web): 고객 상세 사진 스트립·등급 잠금/되돌리기·액션 정리`

---

## Task W5: 고객 폼 (CustomerFormDialog) 등급 선택

**Files:** `components/CustomerFormDialog.tsx`

- [ ] 등급 필드 = `자동(구매횟수 기준)` 기본 + 특정 등급 선택(드롭다운, `getCustomerGrades`). 색 picker 없음.
- [ ] 저장 로직: create/update 본체에는 grade 안 보냄(api에서 제거됨). 등급이 '자동'이 아니면 저장 후 `assignCustomerGrade(id, gradeId)` 호출(수동 고정). '자동' 선택 시 기존 수동고정이면 `revertCustomerGradeAuto` 호출.
- [ ] 기존 전화 중복검증/성별/메모 유지.
- [ ] 커밋 `feat(web): 고객 폼 등급 자동/특정 선택`

---

## Task W6: 사진첩 리스킨 (gallery-client + PhotoCard)

**Files:** `gallery-client.tsx`, `components/gallery/PhotoCard.tsx`

- [ ] **FAB speed-dial**: 새 카드 추가 · 태그 관리(기존 TagManageModal). 상단 버튼/설정 아이콘 제거.
- [ ] **고객 필터**: 기존 customer 필터 유지(이제 BFF가 customer_id 직접 필터). 동작 확인.
- [ ] **PhotoCard 컴포넌트**: 카드에 `customer_name` 있으면 `👤 이름` 배지 표시(없으면 미표시). 태그 배지와 함께.
- [ ] 커밋 `feat(web): 사진첩 FAB·고객 배지`

---

## Task W7: 사진 모달 (작성/상세) 고객 연결

**Files:** `components/gallery/PhotoUploadModal.tsx`, `components/gallery/PhotoCardDialog.tsx`

- [ ] **PhotoUploadModal**(작성/편집): "고객 연결(선택)" 검색 선택기 = `components/sales/CustomerAutocomplete` 재사용. 선택 시 `customer_id` 세팅, 해제 가능(편집 시 clearCustomer). 비워도 저장 가능.
- [ ] **PhotoCardDialog**(상세): `customer_name` 있으면 `👤 이름` 배지 → 클릭 시 고객 상세로 이동(`/admin/customers?... ` 또는 상세 다이얼로그 오픈 규약 확인 — 기존 네비 패턴 따름). 기존 매출 링크와 공존.
- [ ] 커밋 `feat(web): 사진 작성 고객 연결 선택기 + 상세 고객 배지/이동`

---

## Task W8: 검증

- [ ] `npm run lint` 통과
- [ ] `npm test` (관련 테스트 깨짐 없는지; 타입/유틸 테스트)
- [ ] `npm run build` 통과
- [ ] (수동) 3300 dev에서 시안 대조: 고객 목록/상세/등급관리/사진첩/사진작성·상세
- [ ] 커밋 `test(web): 세션3 lint/build 검증`

---

## 자체 검토 메모
- spec 5.5/4.3/6 커버: 등급관리(W2/W5) · 사진매핑(W1/W6/W7) · 목록(W3) · 상세(W4) ✅
- **명칭 충돌**: 기존 `updateCustomerGrade(id, grade:string)` → 등급CRUD는 `updateCustomerGradeConfig`, 고객 등급지정은 `assignCustomerGrade`/`revertCustomerGradeAuto`. 혼선 금지.
- **id 타입**: BFF number ↔ web string 변환은 기존 #76 패턴 그대로. 등급 id도 동일.
- **확인 필요(구현 중)**: CustomerAutocomplete props, FAB 마크업(sales-client 원본), PhotoCardDialog 고객 이동 네비 방식(쿼리파라미터로 상세 오픈하는 기존 규약 유무).
