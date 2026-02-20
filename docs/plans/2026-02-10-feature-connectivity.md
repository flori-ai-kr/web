# 기능 연결성 개선 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 예약 → 매출 → 고객 간 유기적 연결을 구현하여, 각 기능을 따로 등록하지 않고 하나의 흐름으로 처리할 수 있게 한다.

**Architecture:** 예약 카드에 "매출 등록" 버튼을 추가하여 예약 데이터를 매출 폼에 자동 전달. 매출 생성 시 고객 자동 생성(기존 로직 활용). 고객 상세에서 매출 등록 바로가기 추가. 대시보드 예약 카드에서도 바로 매출 전환 가능.

**Tech Stack:** Next.js 16, React 19, Supabase, shadcn/ui, Tailwind v4, sonner

---

## 현재 상태 분석

### 잘 되어 있는 것
- **매출 → 고객**: CustomerAutocomplete로 자동완성, 새 고객 자동 생성 (upsert)
- **고객 → 매출 이력**: 고객 상세에서 구매 이력 조회 + 매출 페이지 이동 링크

### 끊어져 있는 것 (이번에 개선할 부분)
1. **예약 → 매출**: 변환 기능 없음. 사용자가 수동으로 데이터 재입력 필요
2. **대시보드 → 매출 등록**: 예약 카드에서 바로 매출 등록 불가
3. **고객 → 매출 등록**: 고객 상세에서 바로 매출 등록 불가
4. **매출 → 예약**: 매출이 어느 예약에서 왔는지 추적 불가
5. **입금대조 → 매출 상세**: 입금 항목에서 원본 매출 확인 불가

---

## Task 1: 예약→매출 변환 Server Action 추가

**Files:**
- Modify: `src/lib/actions/reservations.ts`
- Modify: `src/types/database.ts` (Sale 인터페이스에 reservation_id 추가)

**Step 1: Sale 타입에 reservation_id 추가**

`src/types/database.ts`의 Sale 인터페이스에 추가:
```typescript
export interface Sale {
  // ... 기존 필드
  reservation_id?: string;  // 추가
}
```

**Step 2: convertReservationToSale 서버 액션 작성**

`src/lib/actions/reservations.ts`에 추가:
```typescript
export async function convertReservationToSale(
  reservationId: string,
  saleFormData: FormData
): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  const supabase = await createClient();

  // 1. 예약 조회
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .single();

  if (fetchError || !reservation) {
    return { success: false, error: '예약을 찾을 수 없습니다' };
  }

  // 2. 매출 생성 (기존 createSale 로직 활용)
  // saleFormData에 reservation_id 포함
  saleFormData.set('reservation_id', reservationId);

  try {
    const sale = await createSale(saleFormData);

    // 3. 예약 상태 업데이트: completed + sale_id 연결
    await supabase
      .from('reservations')
      .update({
        status: 'completed',
        sale_id: sale.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservationId);

    revalidatePath('/calendar');
    return { success: true, sale };
  } catch (error: any) {
    return { success: false, error: error.message || '매출 등록에 실패했습니다' };
  }
}
```

**Step 3: DB에 reservation_id 컬럼 추가**

Supabase migration:
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_reservation_id ON sales(reservation_id);
```

**Step 4: Commit**
```bash
git add src/lib/actions/reservations.ts src/types/database.ts
git commit -m "feat: 예약→매출 변환 서버 액션 추가"
```

---

## Task 2: 캘린더에 "매출 등록" 버튼 추가

**Files:**
- Modify: `src/app/(dashboard)/calendar/calendar-client.tsx`

**Step 1: 매출 등록 모달 상태 추가**

CalendarClient 컴포넌트에 상태 추가:
```typescript
const [saleTarget, setSaleTarget] = useState<Reservation | null>(null);
```

**Step 2: 예약 카드에 "매출 등록" 버튼 추가**

예약 목록의 각 카드(line ~459-500)에 조건부 버튼 추가:
- `r.status !== 'completed'` && `r.status !== 'cancelled'`일 때만 표시
- 이미 `sale_id`가 있으면 "매출 확인" 링크로 변환
```tsx
{r.status !== 'completed' && r.status !== 'cancelled' && !r.sale_id && (
  <Button
    size="sm"
    variant="outline"
    className="mt-2 w-full text-xs h-7"
    onClick={(e) => {
      e.stopPropagation();
      setSaleTarget(r);
    }}
  >
    <ShoppingBag className="h-3 w-3 mr-1" />
    매출 등록
  </Button>
)}
{r.sale_id && (
  <button
    className="mt-2 text-xs text-brand hover:text-brand/80 flex items-center gap-1"
    onClick={(e) => {
      e.stopPropagation();
      router.push(`/sales?saleId=${r.sale_id}`);
    }}
  >
    매출 확인 <ExternalLink className="w-3 h-3" />
  </button>
)}
```

**Step 3: 매출 등록 모달 구현**

캘린더 하단에 Dialog 추가. 예약 데이터로 폼 자동 채움:
- `date` → 예약 날짜
- `customer_name` → 예약 고객명
- `customer_phone` → 예약 전화번호
- `amount` → 예약 예상금액
- `product_category`, `payment_method`, `reservation_channel` → 사용자가 선택

모달 내부에서 `convertReservationToSale()` 호출 후:
- 성공 시: toast.success('매출이 등록되었습니다'), 예약 목록 새로고침
- 실패 시: toast.error(error)

**Step 4: Commit**
```bash
git add src/app/(dashboard)/calendar/calendar-client.tsx
git commit -m "feat: 캘린더 예약 카드에 매출 등록 버튼 추가"
```

---

## Task 3: 대시보드 예약 카드에 "매출 등록" 유도 추가

**Files:**
- Modify: `src/app/(dashboard)/dashboard-client.tsx`

**Step 1: 예약 카드에 매출 전환 링크 추가**

대시보드의 오늘 예약 섹션 (line ~320-350)에서,
`pending` 또는 `confirmed` 상태 예약에 작은 링크 추가:

```tsx
{(r.status === 'pending' || r.status === 'confirmed') && !r.sale_id && (
  <Link
    href={`/calendar?date=${r.date}&action=sale&reservationId=${r.id}`}
    className="text-[11px] text-brand hover:text-brand/80 mt-1 inline-flex items-center gap-0.5"
  >
    매출 등록하기 <ArrowUpRight className="w-2.5 h-2.5" />
  </Link>
)}
```

이렇게 하면 캘린더로 이동하면서 자동으로 매출 등록 모달이 열림.

**Step 2: Commit**
```bash
git add src/app/(dashboard)/dashboard-client.tsx
git commit -m "feat: 대시보드 예약 카드에 매출 등록 유도 링크 추가"
```

---

## Task 4: 캘린더에서 URL 파라미터로 매출 등록 모달 자동 오픈

**Files:**
- Modify: `src/app/(dashboard)/calendar/calendar-client.tsx`

**Step 1: URL 파라미터 읽기**

```typescript
import { useSearchParams } from 'next/navigation';

// 컴포넌트 내부
const searchParams = useSearchParams();

useEffect(() => {
  const action = searchParams.get('action');
  const reservationId = searchParams.get('reservationId');
  const dateParam = searchParams.get('date');

  if (action === 'sale' && reservationId && dateParam) {
    // 해당 날짜로 이동
    setSelectedDate(new Date(dateParam));
    // 예약 로드 후 해당 예약 찾아서 saleTarget 설정
    // (reservations 로드 완료 후 처리)
  }
}, [searchParams]);

// reservations가 로드된 후 saleTarget 설정
useEffect(() => {
  const reservationId = searchParams.get('reservationId');
  if (reservationId && reservations.length > 0) {
    const target = reservations.find(r => r.id === reservationId);
    if (target && !target.sale_id) {
      setSaleTarget(target);
    }
  }
}, [reservations, searchParams]);
```

**Step 2: Commit**
```bash
git add src/app/(dashboard)/calendar/calendar-client.tsx
git commit -m "feat: URL 파라미터로 매출 등록 모달 자동 오픈"
```

---

## Task 5: 고객 상세에서 "매출 등록" 바로가기 추가

**Files:**
- Modify: `src/app/(dashboard)/customers/customers-client.tsx`

**Step 1: 고객 상세 다이얼로그에 "매출 등록" 버튼 추가**

고객 상세 다이얼로그의 하단 버튼 영역 (line ~588-608)에 추가:

```tsx
<Button
  variant="outline"
  onClick={() => {
    // 매출 페이지로 이동하면서 고객 정보 전달
    const params = new URLSearchParams({
      action: 'create',
      customer_name: selectedCustomer.name,
      customer_phone: selectedCustomer.phone,
      customer_id: selectedCustomer.id,
    });
    router.push(`/sales?${params.toString()}`);
    setSelectedCustomer(null);
  }}
>
  <ShoppingBag className="w-4 h-4 mr-2" />
  매출 등록
</Button>
```

**Step 2: Commit**
```bash
git add src/app/(dashboard)/customers/customers-client.tsx
git commit -m "feat: 고객 상세에서 매출 등록 바로가기 추가"
```

---

## Task 6: 매출 페이지에서 URL 파라미터로 폼 자동 채움

**Files:**
- Modify: `src/app/(dashboard)/sales/sales-client.tsx`

**Step 1: URL 파라미터 읽어서 폼 자동 채움**

매출 페이지에서 `action=create` 파라미터가 있으면:
1. 자동으로 등록 다이얼로그 오픈
2. `customer_name`, `customer_phone`, `customer_id` 파라미터로 고객 정보 자동 채움

```typescript
const searchParams = useSearchParams();

useEffect(() => {
  const action = searchParams.get('action');
  if (action === 'create') {
    // 등록 다이얼로그 오픈
    setIsFormOpen(true);
    // 고객 정보 자동 채움
    const customerName = searchParams.get('customer_name');
    const customerPhone = searchParams.get('customer_phone');
    const customerId = searchParams.get('customer_id');
    if (customerName) setFormCustomerName(customerName);
    if (customerPhone) setFormCustomerPhone(customerPhone);
    if (customerId) setFormCustomerId(customerId);
  }
}, [searchParams]);
```

**Step 2: Commit**
```bash
git add src/app/(dashboard)/sales/sales-client.tsx
git commit -m "feat: 매출 페이지 URL 파라미터로 폼 자동 채움"
```

---

## Task 7: 입금대조에서 매출 상세 보기 링크 추가

**Files:**
- Modify: `src/app/(dashboard)/deposits/page.tsx`

**Step 1: 각 입금 항목에 매출 상세 보기 링크 추가**

입금 대조 테이블의 각 행에 ExternalLink 아이콘 버튼 추가:

```tsx
<button
  onClick={() => {
    const saleDate = new Date(deposit.date);
    router.push(`/sales?year=${saleDate.getFullYear()}&month=${saleDate.getMonth()+1}&saleId=${deposit.id}`);
  }}
  className="text-brand hover:text-brand/80 p-1"
  title="매출 상세 보기"
>
  <ExternalLink className="w-3.5 h-3.5" />
</button>
```

**Step 2: Commit**
```bash
git add src/app/(dashboard)/deposits/page.tsx
git commit -m "feat: 입금대조에서 매출 상세 보기 링크 추가"
```

---

## Task 8: sales.ts 고객 처리 로직 중복 제거

**Files:**
- Modify: `src/lib/actions/sales.ts`
- Modify: `src/lib/actions/customers.ts`

**Step 1: 공용 헬퍼 함수 추출**

`customers.ts`에 이미 있는 `findOrCreateCustomer` 또는 `getOrCreateCustomer`를 활용하여,
`sales.ts`의 createSale/updateSale에서 중복된 ~50줄 고객 처리 로직을 단일 함수 호출로 교체:

```typescript
// sales.ts에서
import { findOrCreateCustomer } from './customers';

// createSale 내부 (line 48-95 대체)
let finalCustomerId = customerId || null;
if (!finalCustomerId && customerName?.trim()) {
  finalCustomerId = await findOrCreateCustomer(customerName.trim(), customerPhone?.trim() || null);
}
```

**Step 2: createSale에 reservation_id 지원 추가**

```typescript
const sale = {
  // ... 기존 필드
  reservation_id: formData.get('reservation_id') as string || null,
};
```

**Step 3: Commit**
```bash
git add src/lib/actions/sales.ts src/lib/actions/customers.ts
git commit -m "refactor: 매출 서버액션 고객 처리 로직 중복 제거"
```

---

## Task 9: 캘린더 예약 폼에 고객 자동완성 연동

**Files:**
- Modify: `src/app/(dashboard)/calendar/calendar-client.tsx`

**Step 1: CustomerAutocomplete 임포트 및 사용**

현재 캘린더의 고객명 입력이 단순 Input인데,
기존 `CustomerAutocomplete` 컴포넌트를 재사용:

```tsx
import { CustomerAutocomplete } from '@/components/sales/CustomerAutocomplete';

// 예약 폼 내부의 고객명 Input을 CustomerAutocomplete로 교체
<CustomerAutocomplete
  value={formData.customer_name}
  onChange={(name, phone, customerId) => {
    setFormData({
      ...formData,
      customer_name: name,
      customer_phone: phone || formData.customer_phone,
    });
  }}
/>
```

이렇게 하면 예약 등록 시에도 기존 고객을 검색/선택 가능.

**Step 2: Commit**
```bash
git add src/app/(dashboard)/calendar/calendar-client.tsx
git commit -m "feat: 캘린더 예약 폼에 고객 자동완성 연동"
```

---

## 연결 흐름 요약 (구현 후)

```
[예약 등록] ──고객 자동완성──> [고객 DB]
    │
    ├─ 캘린더 "매출 등록" 버튼
    │   └─ 예약 데이터 자동 채움 → [매출 등록 모달]
    │       └─ 저장 시 → [매출 생성] + [예약 상태=완료] + [고객 자동 생성/연결]
    │
    └─ 대시보드 "매출 등록하기" 링크
        └─ 캘린더로 이동 → 매출 등록 모달 자동 오픈

[고객 상세] ──"매출 등록" 버튼──> [매출 페이지] (고객 정보 자동 채움)
    └─ 구매 이력 ──"상세 보기"──> [매출 페이지 해당 건]

[입금대조] ──"매출 확인"──> [매출 페이지 해당 건]
```

**현재 11단계 → 개선 후 3단계**로 워크플로우 단축.
