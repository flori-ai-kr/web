# 자동완성(Suggestions) 설계

## 목적

예약/매출/지출 폼에서 과거 입력값 기반 자동완성을 제공한다.

### 대상 필드

| 폼 | 필드 | DB 테이블.컬럼 |
|----|------|----------------|
| 예약 | 제목 (title) | reservations.title |
| 예약 | 메모 (description) | reservations.description |
| 매출 | 비고 (note) | sales.note |
| 지출 | 물품명 (item_name) | expenses.item_name |
| 지출 | 거래처 (vendor) | expenses.vendor |
| 지출 | 비고 (note) | expenses.note |

## 접근법: 프리로드 + 클라이언트 필터링

폼 오픈 시 과거 DISTINCT 값을 1회 로드하여 클라이언트에 캐싱. 타이핑 시 JS `filter()`로 즉시 필터링.

### 선택 이유

- 꽃집 규모(유저당 수백~수천 건)에서 DISTINCT 쿼리 수ms 이내
- 타이핑마다 네트워크 왕복 0 → 즉각 반응
- DB 인덱스 추가 불필요 (기존 `user_id` 인덱스 활용)
- 구현 복잡도 최소

## 컴포넌트: SuggestionInput

재사용 가능한 자동완성 Input 컴포넌트. `src/components/ui/SuggestionInput.tsx`

### Props

```ts
interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  maxLength?: number;
}
```

### 동작

- 포커스 시 + 타이핑 시 드롭다운 표시 (매칭 결과가 있을 때)
- 클릭 외부 → 드롭다운 닫기 (wrapperRef + mousedown 리스너)
- 항목 선택 → 값 채우기 + 드롭다운 닫기
- 직접 타이핑도 가능 (자유 텍스트)
- 빈 입력 시 전체 목록 표시 (최대 10개)

## Server Actions

### 1. getReservationSuggestions

```ts
// src/lib/actions/reservations.ts
// SELECT DISTINCT title, description FROM reservations WHERE user_id = ?
```

### 2. getSaleSuggestions

```ts
// src/lib/actions/sales.ts
// SELECT DISTINCT note FROM sales WHERE user_id = ?
```

### 3. getExpenseSuggestions

```ts
// src/lib/actions/expenses.ts
// SELECT DISTINCT item_name, vendor, note FROM expenses WHERE user_id = ?
```

## 각 폼 통합

### 예약 (calendar-client.tsx)

- 폼 오픈 시 `getReservationSuggestions()` 1회 호출
- 제목: `<Input>` → `<SuggestionInput suggestions={titles}>`
- 메모: `<textarea>` → `<SuggestionInput suggestions={descriptions}>`

### 매출 (SaleFormDialog.tsx)

- 다이얼로그 오픈 시 `getSaleSuggestions()` 1회 호출
- 비고: `<Textarea>` → `<SuggestionInput suggestions={notes}>`

### 지출 (expenses-client.tsx)

- 폼 오픈 시 `getExpenseSuggestions()` 1회 호출
- 물품명/거래처/비고: 각각 `<SuggestionInput>` 적용
- uncontrolled → controlled 전환 필요 (item_name, vendor)

## 성능

- 유저당 격리: RLS + `user_id` 인덱스
- 1회 호출: 폼 오픈 시만
- JS 필터링: 수천 건도 < 1ms
- 추가 인덱스 불필요

## 변경 파일

1. `src/components/ui/SuggestionInput.tsx` — 새 컴포넌트
2. `src/lib/actions/reservations.ts` — `getReservationSuggestions` 추가
3. `src/lib/actions/sales.ts` — `getSaleSuggestions` 추가
4. `src/lib/actions/expenses.ts` — `getExpenseSuggestions` 추가
5. `src/lib/actions/index.ts` — export 추가
6. `src/app/(dashboard)/calendar/calendar-client.tsx` — 예약 폼 통합
7. `src/app/(dashboard)/sales/components/SaleFormDialog.tsx` — 매출 폼 통합
8. `src/app/(dashboard)/expenses/expenses-client.tsx` — 지출 폼 통합
