# WEB-CLEANUP — flori web 어드민 확정 기준 변경 로그

flori `web`(Next.js 어드민)를 SSOT로 다듬으며 제거/변경한 내역을 기록한다.
이 문서는 **mobile(`refactor/web-parity-sync`)·server 동기화의 입력**이다.
각 항목은 "무엇을 / 어디서 / 모바일·서버가 따라가야 할 것"을 명시한다.

---

## 2026-05-26 — 입금대조 + 카드사별 수수료율 기능 제거

### 배경
입금대조(deposits)와 카드사별 수수료율(card_company_settings)은 매장 운영 흐름에서
사용하지 않아 제거. 두 기능은 `sales` 테이블의 입금/수수료 컬럼으로 한 덩어리로 얽혀 있어 함께 제거.

### 제거된 화면 / 라우트
| 구분 | 경로 | 처리 |
|---|---|---|
| 입금대조 페이지 | `/admin/deposits` | **라우트 삭제** (page.tsx 제거) |
| 설정 — 카드사별 수수료율 섹션 | `/admin/settings` 내 카드 카드블록 | UI 제거 (푸시·하단바 설정은 유지) |
| 설정 — "설정 저장" 버튼 | `/admin/settings` | 제거 (카드 설정 저장 전용이었음) |
| 매출 등록 폼 — "카드사" 선택 필드 | 매출 등록/수정 다이얼로그 | 제거 (`'card'` 결제수단 자체는 유지) |
| 대시보드 — "미입금 N건" 카드 | `/admin` | 제거 (입금대조로 연결되던 카드) |

### 제거된 서버 액션 (모바일/서버가 호출하면 안 됨)
- `getDeposits`, `getPendingDeposits`, `getCompletedDeposits`, `confirmDeposit`,
  `confirmMultipleDeposits`, `revertDeposit`, `getDepositsSummary` — `lib/actions/deposits.ts` **파일 삭제**
- `getCardCompanySettings`, `updateCardCompanySetting`, `createCardCompanySetting`,
  `deleteCardCompanySetting` — `lib/actions/settings.ts`에서 제거
- `saveAllSettings` — 시그니처 변경: 카드 인자 제거, `(categories: string[])`만 받음

### 데이터 모델 변경 (코드 레벨, DB는 보류)
- `sales`에서 다음 필드 더 이상 읽기/쓰기 안 함: `card_company`, `fee`,
  `expected_deposit`, `expected_deposit_date`, `deposit_status`
- 타입 제거: `DepositStatus`, `CardCompanySetting` (`types/database.ts`)
- `DashboardSummary`에서 `pendingCount`, `pendingAmount` 제거
- 대시보드 집계 쿼리에서 `deposit_status` select 제거

### ⚠️ DB 변경 — 보류 중 (일괄 배포 예정)
- 마이그레이션 파일 작성됨(미적용): `supabase/migrations/2026-05-26-drop-deposits-card-fee.sql`
- 내용: `card_company_settings` 테이블 DROP + `sales`의 위 5개 컬럼 DROP + `idx_sales_deposit_status` DROP
- **적용 시점**: web·mobile·server 코드가 모두 정렬된 후 한 번에 실행 (expand-contract)
- `supabase/schema.sql`은 실제 DB와 일치하도록 적용 전까지 미수정

### 보존 (혼동 주의 — 제거하지 않음)
- **미수/외상**: `payment_method='unpaid'`, `is_unpaid`, `completeUnpaidSale`, `revertUnpaidSale`
- **'card' 결제수단 값** 자체 (카드 결제 등록은 계속 가능, 카드사·수수료 계산만 제거)
- **expenses 도메인의 `card_company`** (지출 기능의 별도 필드 — 입금대조와 무관)
- `product_categories` 관련 함수 (별개 미사용 코드, 이번 범위 밖)

### 모바일/서버 동기화 액션
- **mobile**: `/admin/deposits` 대응 화면, 카드사 설정 화면, 매출 폼의 카드사 선택, 대시보드 미입금 위젯 제거. deposits/card 관련 API 호출 제거.
- **server**: deposits 관련 엔드포인트/로직, card_company_settings CRUD, 매출 생성 시 expected_deposit/fee 계산 로직 제거. DB 일괄 마이그레이션은 web 마이그레이션 파일과 동기화.

### 검증 (web)
- `npx tsc --noEmit`: 통과 (0 errors)
- `npm run lint`: 0 errors
- `npm test`: 130/130 통과
- `npm run build`: 성공 (`/admin/deposits` 라우트 사라짐 확인)
- 변경/삭제 파일 19개 (deposits/page.tsx·deposits.ts 삭제 + 17개 수정)
