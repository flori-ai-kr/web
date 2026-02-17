# 멀티 픽업 예약 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 하나의 매출(결제)에서 여러 예약(픽업)이 파생될 수 있도록 DB, Server Action, UI를 변경한다.

**Architecture:** `sales.reservation_id` 컬럼을 삭제하여 1:1 제약을 제거하고, 기존 `reservations.sale_id` FK만으로 1:N 관계를 구현한다. `reservations.payment_date` 컬럼도 제거한다. 캘린더 UI에서 "픽업 추가" 기능으로 같은 매출에 예약을 추가할 수 있다.

**Tech Stack:** Supabase (PostgreSQL), Next.js Server Actions, Zod, React

---

### Task 1: DB 마이그레이션 - sales.reservation_id 삭제

**Files:**
- Modify: `supabase/schema.sql` (line 89 `reservation_id` 제거)
- Modify: Supabase MCP로 마이그레이션 실행

**Step 1: 마이그레이션 SQL 실행**

Supabase MCP `apply_migration`으로 실행:
```sql
-- sales.reservation_id 컬럼 삭제 (기존 연결 정보는 reservations.sale_id에 보존됨)
ALTER TABLE sales DROP COLUMN IF EXISTS reservation_id;

-- reservations.payment_date 컬럼 삭제 (매출 날짜가 결제일이 됨)
ALTER TABLE reservations DROP COLUMN IF EXISTS payment_date;
```

**Step 2: schema.sql 업데이트**

`supabase/schema.sql`에서:
- Line 89: `reservation_id UUID REFERENCES reservations(id),` 삭제

**Step 3: 커밋**

```bash
git add supabase/schema.sql
git commit -m "chore: sales.reservation_id, reservations.payment_date 컬럼 삭제 마이그레이션"
```

---

### Task 2: 타입 + Zod 스키마 업데이트

**Files:**
- Modify: `src/types/database.ts:63` (`reservation_id` 제거)
- Modify: `src/types/database.ts:170` (`payment_date` 제거)
- Modify: `src/lib/validations.ts:29` (`reservation_id` 제거)

**Step 1: Sale 타입에서 reservation_id 제거**

`src/types/database.ts` line 63:
```typescript
// 삭제: reservation_id?: string;
```

**Step 2: Reservation 타입에서 payment_date 제거**

`src/types/database.ts` line 170:
```typescript
// 삭제: payment_date: string | null;
```

**Step 3: saleSchema에서 reservation_id 제거**

`src/lib/validations.ts` line 29:
```typescript
// 삭제: reservation_id: uuidSchema.nullable().optional(),
```

**Step 4: 빌드 확인**

Run: `npx next build 2>&1 | tail -20`
Expected: 타입 에러 발생 (아직 참조하는 코드가 있으므로) — 다음 Task에서 수정

**Step 5: 커밋**

```bash
git add src/types/database.ts src/lib/validations.ts
git commit -m "refactor: Sale에서 reservation_id, Reservation에서 payment_date 타입 제거"
```

---

### Task 3: Server Actions 업데이트

**Files:**
- Modify: `src/lib/actions/sales.ts:93,118` (`reservation_id` 참조 제거)
- Modify: `src/lib/actions/reservations.ts:64,88,116-118,156-196` (`payment_date` 참조 제거 + `convertReservationToSale` 수정)
- Create: `addPickupToSale` 함수 in `src/lib/actions/reservations.ts`
- Create: `getReservationsForSale` 함수 in `src/lib/actions/reservations.ts`

**Step 1: sales.ts에서 reservation_id 제거**

`src/lib/actions/sales.ts`:
- Line 93: `reservation_id: formData.get('reservation_id') as string || null,` → 삭제
- Line 118: `reservation_id: parsed.data.reservation_id || null,` → 삭제

**Step 2: reservations.ts에서 payment_date 제거**

`src/lib/actions/reservations.ts`:
- `_createReservation` 함수 파라미터에서 `payment_date` 제거 (line ~88)
- `_createReservation` insert에서 `payment_date` 제거 (line ~64)
- `_updateReservation` 파라미터에서 `payment_date` 제거 (line ~88)
- `_updateReservation` body에서 `payment_date` 처리 코드 제거 (lines 116-118)

**Step 3: convertReservationToSale 수정**

`src/lib/actions/reservations.ts` lines 156-196에서:
- `reservation.payment_date` 참조 제거 (lines 175-177)
- `saleFormData.set('reservation_id', reservationId)` 제거 (line 178)
- 나머지 로직 유지 (매출 생성 → 예약에 sale_id 설정)

수정 후:
```typescript
async function _convertReservationToSale(
  reservationId: string,
  saleFormData: FormData,
): Promise<Sale> {
  const user = await requireAuth();
  const idParsed = uuidSchema.safeParse(reservationId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const supabase = await createClient();
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .single();
  if (fetchError || !reservation) throw new AppError(ErrorCode.NOT_FOUND, '예약을 찾을 수 없습니다');

  // reservation_id 설정 없이 매출 생성
  const sale = await createSale(saleFormData);

  // 예약에 sale_id 연결 + 상태 변경
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      status: 'confirmed',
      sale_id: sale.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId);
  if (updateError) throw updateError;

  return sale;
}
```

**Step 4: addPickupToSale 함수 추가**

`src/lib/actions/reservations.ts`에 추가:
```typescript
async function _addPickupToSale(
  saleId: string,
  formData: {
    date: string;
    time?: string;
    title: string;
    estimated_amount?: number;
    reminder_at?: string | null;
  }
): Promise<Reservation> {
  const user = await requireAuth();

  const saleParsed = uuidSchema.safeParse(saleId);
  if (!saleParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 매출 ID입니다');

  // 매출에서 고객 정보 가져오기
  const supabase = await createClient();
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('customer_name, customer_phone')
    .eq('id', saleId)
    .single();
  if (saleError || !sale) throw new AppError(ErrorCode.NOT_FOUND, '매출을 찾을 수 없습니다');

  const parsed = reservationSchema.pick({
    date: true,
    time: true,
    title: true,
    estimated_amount: true,
    reminder_at: true,
  }).extend({
    customer_name: z.string().max(100).optional(),
  }).safeParse({
    date: formData.date,
    time: formData.time || null,
    title: formData.title,
    estimated_amount: formData.estimated_amount,
    reminder_at: formData.reminder_at,
    customer_name: sale.customer_name || '',
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      date: parsed.data.date,
      time: parsed.data.time || null,
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || null,
      title: parsed.data.title,
      estimated_amount: parsed.data.estimated_amount || 0,
      status: 'confirmed',
      sale_id: saleId,
      reminder_at: parsed.data.reminder_at || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const addPickupToSale = withErrorLogging('addPickupToSale', _addPickupToSale);
```

**Step 5: getReservationsForSale 함수 추가**

`src/lib/actions/reservations.ts`에 추가:
```typescript
async function _getReservationsForSale(saleId: string): Promise<Reservation[]> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(saleId);
  if (!idParsed.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('sale_id', saleId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export const getReservationsForSale = withErrorLogging('getReservationsForSale', _getReservationsForSale);
```

**Step 6: barrel export 업데이트**

`src/lib/actions/index.ts`에 `addPickupToSale`, `getReservationsForSale` export 추가

**Step 7: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -20`
Expected: 아직 calendar-client.tsx에서 payment_date 참조 에러 가능 → Task 4에서 수정

```bash
git add src/lib/actions/reservations.ts src/lib/actions/sales.ts src/lib/actions/index.ts
git commit -m "refactor: Server Actions에서 reservation_id/payment_date 제거 + addPickupToSale 추가"
```

---

### Task 4: 캘린더 예약 폼 업데이트

**Files:**
- Modify: `src/app/(dashboard)/calendar/calendar-client.tsx`

**Step 1: formData 상태에서 payment_date 제거, pickup_date 추가**

Lines 116-129 — `formData` state:
```typescript
const [formData, setFormData] = useState({
  title: '',
  customer_name: '',
  customer_phone: '',
  time: '',
  description: '',
  estimated_amount: '',
  product_category: '',
  payment_method: '',
  reservation_channel: 'other',
  reminder_date: '',
  reminder_time: '',
  pickup_date: '',  // 기존 payment_date → pickup_date로 변경
});
```

**Step 2: handleSubmit에서 payment_date → pickup_date 로직 변경**

Lines 426-452 (create path):
- 예약 생성 시: `date: formData.pickup_date || dateStr` (픽업일자가 있으면 픽업일자, 없으면 선택 날짜)
- 매출 생성 시: `saleFormData.set('date', dateStr)` (매출 날짜는 항상 선택한 날짜)
- `createReservation`에 `payment_date` 전달 제거

```typescript
// 예약 생성
const reservation = await createReservation({
  date: formData.pickup_date || dateStr,  // 픽업일이 별도 있으면 그 날짜로
  time: formData.time || undefined,
  customer_name: formData.customer_name,
  customer_phone: formData.customer_phone || undefined,
  title: formData.title,
  description: formData.description || undefined,
  estimated_amount: parseInt(formData.estimated_amount) || 0,
  reminder_at: reminderISO,
  // payment_date 제거
});

// 매출 생성 (날짜는 항상 선택된 캘린더 날짜)
const saleFormData = new FormData();
saleFormData.set('date', dateStr);  // 매출 날짜 = 캘린더 선택 날짜
saleFormData.set('product_category', formData.product_category);
// ... 나머지 동일
```

**Step 3: 편집 경로에서 payment_date 제거**

Lines 412-424 (edit path):
- `updateReservation` 호출에서 `payment_date` 제거
- 픽업 날짜 변경은 `date` 필드로 직접

**Step 4: startEdit에서 payment_date → pickup_date**

Line 353: `payment_date: reservation.payment_date || ''` → 제거
대신 예약의 `date`가 이미 픽업 날짜이므로 별도 처리 불필요

**Step 5: UI에서 "결제일자 지정" → "픽업일자 지정"**

Lines 1146-1176:
- 체크박스 라벨: `결제일자 지정` → `픽업일자 지정`
- 도움말: `매출이 {date} 일자로 등록됩니다` → `{date}에 픽업 예정`
- `formData.payment_date` 참조 전부 → `formData.pickup_date`로 변경

**Step 6: 빌드 확인 + 커밋**

```bash
npx next build 2>&1 | tail -20
git add src/app/\(dashboard\)/calendar/calendar-client.tsx
git commit -m "refactor: 캘린더 폼에서 payment_date를 pickup_date로 변경"
```

---

### Task 5: "픽업 추가" 기능 + 예약 상세 패널 그룹 표시

**Files:**
- Modify: `src/app/(dashboard)/calendar/calendar-client.tsx`

**Step 1: 같은 sale_id 예약 그룹핑 데이터 준비**

`selectedDateReservations` 계산 후, 같은 `sale_id`를 가진 예약들을 그룹핑하는 useMemo 추가:

```typescript
// 선택된 날짜의 예약을 sale_id 기준으로 그룹핑
const groupedReservations = useMemo(() => {
  const groups: { saleId: string | null; reservations: Reservation[] }[] = [];
  const saleGroups = new Map<string, Reservation[]>();

  for (const r of selectedDateReservations) {
    if (r.sale_id) {
      if (!saleGroups.has(r.sale_id)) saleGroups.set(r.sale_id, []);
      saleGroups.get(r.sale_id)!.push(r);
    } else {
      groups.push({ saleId: null, reservations: [r] });
    }
  }

  for (const [saleId, reservations] of saleGroups) {
    groups.push({ saleId, reservations });
  }

  return groups;
}, [selectedDateReservations]);
```

**Step 2: 같은 매출의 다른 날짜 예약 조회**

같은 `sale_id`를 가진 전체 예약을 찾기 위해, `reservations` 배열 (이미 fetch된 전체 데이터)에서 필터링:

```typescript
// sale_id로 모든 관련 예약 찾기 (다른 날짜 포함)
const siblingReservations = useMemo(() => {
  const map = new Map<string, Reservation[]>();
  for (const r of reservations) {
    if (r.sale_id) {
      if (!map.has(r.sale_id)) map.set(r.sale_id, []);
      map.get(r.sale_id)!.push(r);
    }
  }
  return map;
}, [reservations]);
```

**Step 3: "픽업 추가" 폼 상태 추가**

```typescript
const [addPickupSaleId, setAddPickupSaleId] = useState<string | null>(null);
const [pickupFormData, setPickupFormData] = useState({
  date: '',
  time: '',
  title: '',
  estimated_amount: '',
  reminder_date: '',
  reminder_time: '',
});
```

**Step 4: "픽업 추가" 제출 핸들러**

```typescript
async function handleAddPickup() {
  if (!addPickupSaleId || !pickupFormData.date || !pickupFormData.title) {
    toast.error('픽업 날짜와 제목을 입력해주세요');
    return;
  }
  try {
    let reminderISO: string | null = null;
    if (pickupFormData.reminder_date) {
      const time = pickupFormData.reminder_time || '08:00';
      reminderISO = new Date(`${pickupFormData.reminder_date}T${time}:00+09:00`).toISOString();
    }
    await addPickupToSale(addPickupSaleId, {
      date: pickupFormData.date,
      time: pickupFormData.time || undefined,
      title: pickupFormData.title,
      estimated_amount: parseInt(pickupFormData.estimated_amount) || 0,
      reminder_at: reminderISO,
    });
    toast.success('픽업이 추가되었습니다');
    setAddPickupSaleId(null);
    setPickupFormData({ date: '', time: '', title: '', estimated_amount: '', reminder_date: '', reminder_time: '' });
    fetchData();
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : '픽업 추가에 실패했습니다');
  }
}
```

**Step 5: 예약 상세 패널에서 그룹 표시 + "픽업 추가" 버튼**

예약 상세 패널 (lines ~1280-1400)을 수정:
- 같은 `sale_id`의 다른 예약들 날짜 표시 (예: "2/9, 2/20")
- 각 예약 아래 제작완료/픽업완료 토글 유지
- 그룹 하단에 "픽업 추가" 버튼
- 버튼 클릭 시 간소화 폼 표시: 픽업 날짜, 시간, 제목, 예상 금액

**Step 6: "픽업 추가" 인라인 폼 UI**

"픽업 추가" 버튼 클릭 시 예약 상세 패널 하단에 Card로 폼 표시:
```tsx
{addPickupSaleId === r.sale_id && (
  <Card className="mt-2">
    <CardContent className="p-3 space-y-2">
      <p className="text-xs font-semibold">픽업 추가</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">픽업 날짜 *</Label>
          <Input type="date" value={pickupFormData.date}
            onChange={(e) => setPickupFormData({...pickupFormData, date: e.target.value})}
            className="h-8" />
        </div>
        <TimeSelect value={pickupFormData.time}
          onChange={(val) => setPickupFormData({...pickupFormData, time: val})} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">제목 *</Label>
        <Input value={pickupFormData.title}
          onChange={(e) => setPickupFormData({...pickupFormData, title: e.target.value})}
          placeholder="프로포즈 꽃다발" className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">예상 금액</Label>
        <AmountInput name="pickup_amount" value={parseInt(pickupFormData.estimated_amount) || 0}
          onChange={(val) => setPickupFormData({...pickupFormData, estimated_amount: String(val)})}
          className="h-8" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => setAddPickupSaleId(null)}>취소</Button>
        <Button size="sm" onClick={handleAddPickup}>추가</Button>
      </div>
    </CardContent>
  </Card>
)}
```

**Step 7: 빌드 확인 + 커밋**

```bash
npx next build 2>&1 | tail -20
git add src/app/\(dashboard\)/calendar/calendar-client.tsx
git commit -m "feat: 캘린더에서 픽업 추가 기능 + 예약 그룹 표시"
```

---

### Task 6: 매출 상세 다이얼로그에 연결된 예약 목록 표시

**Files:**
- Modify: `src/app/(dashboard)/sales/components/SaleDetailDialog.tsx`
- Modify: `src/app/(dashboard)/sales/sales-client.tsx` (SaleDetailDialog에 예약 데이터 전달)

**Step 1: SaleDetailDialog에 연결된 예약 표시**

SaleDetailDialog props에 `reservations` 추가:
```typescript
interface SaleDetailDialogProps {
  // ... 기존 props
  linkedReservations?: Reservation[];
}
```

기존 photos 섹션 위에 예약 목록 섹션 추가:
```tsx
{linkedReservations && linkedReservations.length > 0 && (
  <div className="space-y-2 pt-2 border-t">
    <p className="text-sm text-muted-foreground">연결된 예약 ({linkedReservations.length}건)</p>
    <div className="space-y-1.5">
      {linkedReservations.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm">
          <span className={cn(
            'w-2 h-2 rounded-full shrink-0',
            r.pickup_completed ? 'bg-blue-500'
              : r.status === 'completed' ? 'bg-sage'
              : 'bg-brand'
          )} />
          <span className="font-medium">{format(new Date(r.date), 'M/d')}</span>
          {r.time && <span className="text-muted-foreground">{r.time.slice(0, 5)}</span>}
          <span className="truncate">{r.title}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 2: sales-client.tsx에서 예약 데이터 fetch + 전달**

선택된 매출의 연결 예약을 조회하여 SaleDetailDialog에 전달:
```typescript
const [linkedReservations, setLinkedReservations] = useState<Reservation[]>([]);

// 매출 선택 시 연결 예약 조회
useEffect(() => {
  if (selectedSale) {
    getReservationsForSale(selectedSale.id).then(setLinkedReservations).catch(() => setLinkedReservations([]));
  } else {
    setLinkedReservations([]);
  }
}, [selectedSale]);
```

SaleDetailDialog에 prop 전달:
```tsx
<SaleDetailDialog
  sale={selectedSale}
  linkedReservations={linkedReservations}
  // ... 나머지 props
/>
```

**Step 3: import 추가**

- sales-client.tsx: `import { getReservationsForSale } from '@/lib/actions'`
- SaleDetailDialog: `import type { Reservation } from '@/types/database'`

**Step 4: 빌드 확인 + 커밋**

```bash
npx next build 2>&1 | tail -20
git add src/app/\(dashboard\)/sales/components/SaleDetailDialog.tsx src/app/\(dashboard\)/sales/sales-client.tsx
git commit -m "feat: 매출 상세에 연결된 예약 목록 표시"
```

---

### Task 7: 최종 빌드 검증 + 정리

**Step 1: 전체 빌드 확인**

```bash
npx next build 2>&1 | tail -30
```

**Step 2: payment_date/reservation_id 잔존 참조 검색**

```bash
grep -r "payment_date" src/ --include="*.ts" --include="*.tsx"
grep -r "reservation_id" src/ --include="*.ts" --include="*.tsx"
```

잔존 참조가 있으면 제거.

**Step 3: schema.sql 최종 업데이트**

schema.sql에서 `payment_date`, `reservation_id` 관련 줄이 모두 제거되었는지 확인.

**Step 4: 최종 커밋**

```bash
git add -f docs/plans/2026-02-17-multi-pickup-implementation.md
# 나머지 수정 파일도 추가
git commit -m "chore: 멀티 픽업 최종 정리 + 잔존 참조 제거"
```
