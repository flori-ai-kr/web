# 미수(외상) 매출 기능 설계

## 개요

예약 시 결제방식으로 '미수'를 선택하면, 해당 매출은 총 매출에 합산되지 않다가 픽업 완료 시 실제 결제방식을 선택하면 최종 매출로 반영되는 기능.

## 핵심 흐름

```
예약 생성 (결제방식: 미수)
  → 매출 생성 (payment_method = 'unpaid', is_unpaid = true)
  → 매출 합산에서 제외
  → 제작 완료 → 픽업 완료 버튼 클릭
  → [미수건이면] 결제방식 선택 팝업 표시
  → 실제 결제방식 선택 (카드/현금/이체 등)
  → 매출 payment_method 변경 → 총 매출에 합산
  → 미수 칩 제거
```

### 픽업 취소 시
- `is_unpaid = true`인 매출의 payment_method를 다시 'unpaid'로 되돌림
- 매출 합산에서 다시 제외

## DB 변경

### 1. sales 테이블
- `payment_method` CHECK 제약에 `'unpaid'` 추가
- `is_unpaid BOOLEAN DEFAULT FALSE` 컬럼 추가

### 2. payment_methods 테이블
- 각 user_id별로 `{value: 'unpaid', label: '미수', color: '#ef4444', sort_order: 99}` 행 추가

### 3. get_sales_summary RPC
- `WHERE payment_method != 'unpaid'` 조건 추가하여 미수건 총 매출에서 제외

## 코드 변경

### 타입 (`src/types/database.ts`)
- `PaymentMethod`에 `'unpaid'` 추가
- `Sale` 인터페이스에 `is_unpaid: boolean` 추가

### 상수 (`src/lib/constants.ts`)
- `PAYMENT_LABELS`에 `unpaid: '미수'` 추가

### 검증 (`src/lib/validations.ts`)
- `saleSchema.payment_method`에 `'unpaid'` 추가

### Server Actions
- `createSale`: payment_method가 'unpaid'이면 `is_unpaid = true` 설정
- `updateSale`: 기존 로직 유지 (payment_method 변경 가능)
- 새 액션 `completeUnpaidSale(saleId, paymentMethod)`: 미수 → 실제 결제로 전환

### 캘린더 (`calendar-client.tsx`)
- `togglePickup` 수정: 미수건 픽업 완료 시 → 결제방식 선택 Dialog 표시
- Dialog에서 결제방식 선택 후 → sale payment_method 업데이트 + 픽업 완료 처리
- 픽업 취소 시: `is_unpaid`인 건 → payment_method를 'unpaid'로 되돌림
- 예약 카드에 미수 칩 표시

### 매출 목록 (`SalesList.tsx`)
- 미수건(payment_method = 'unpaid')에 미수 칩 표시
- 일자별 합계에서 미수건 제외

### 매출 요약 (`SalesSummary.tsx`)
- RPC에서 이미 제외되므로 별도 처리 불필요

### 예약 → 매출 변환 시 is_unpaid 전달
- `getReservations`에서 sale의 `is_unpaid` 필드도 조인하여 전달 (미수 칩 표시용)

## 미수 칩 디자인
- 색상: `#ef4444` (red-500)
- 스타일: 기존 결제방식 배지와 동일 패턴 (`backgroundColor: ${color}40`, `color: color`)
- 위치: 매출 카드의 결제방식 배지 자리 / 예약 카드의 제목 옆
