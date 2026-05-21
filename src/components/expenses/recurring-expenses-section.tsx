'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AmountInput } from '@/components/ui/amount-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Power, PowerOff, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenses,
  nextOccurrenceISO,
  toggleRecurringExpenseActive,
  updateRecurringExpense,
} from '@/lib/actions/recurring-expenses';
import { getExpenseCategories, getExpensePaymentMethods, type ExpenseCategory, type ExpensePaymentMethod } from '@/lib/actions/expense-settings';
import type { RecurringExpense, RecurringFrequency } from '@/types/database';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const FREQ_LABELS: Record<RecurringFrequency, string> = { weekly: '매주', monthly: '매월', yearly: '매년' };

interface FormState {
  id?: string;
  item_name: string;
  category: string;
  unit_price: number;
  quantity: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'naverpay' | 'kakaopay';
  vendor: string;
  note: string;
  frequency: RecurringFrequency;
  interval_count: number;
  day_of_week: number | null;
  day_of_month: number | null;
  month_of_year: number | null;
  start_date: string;
  end_date: string;
  auto_generate: boolean;
  is_active: boolean;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm(defaultCategory: string, defaultPayment: 'cash' | 'card' | 'transfer' | 'naverpay' | 'kakaopay'): FormState {
  const t = new Date();
  return {
    item_name: '',
    category: defaultCategory,
    unit_price: 0,
    quantity: 1,
    payment_method: defaultPayment,
    vendor: '',
    note: '',
    frequency: 'monthly',
    interval_count: 1,
    day_of_week: null,
    day_of_month: t.getDate(),
    month_of_year: null,
    start_date: todayISO(),
    end_date: '',
    auto_generate: true,
    is_active: true,
  };
}

function ruleSummary(r: RecurringExpense): string {
  if (r.frequency === 'weekly') {
    return `${r.interval_count > 1 ? `${r.interval_count}주마다` : '매주'} ${WEEKDAY_LABELS[r.day_of_week ?? 0]}요일`;
  }
  if (r.frequency === 'monthly') {
    return `${r.interval_count > 1 ? `${r.interval_count}개월마다` : '매월'} ${r.day_of_month}일`;
  }
  return `${r.interval_count > 1 ? `${r.interval_count}년마다` : '매년'} ${r.month_of_year}월 ${r.day_of_month}일`;
}

export function RecurringExpensesSection() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [payments, setPayments] = useState<ExpensePaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringExpense | null>(null);
  const [nextDates, setNextDates] = useState<Record<string, string | null>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, cats, pays] = await Promise.all([
        getRecurringExpenses(),
        getExpenseCategories(),
        getExpensePaymentMethods(),
      ]);
      setItems(list);
      setCategories(cats);
      setPayments(pays);
      // 다음 발생일 계산
      const map: Record<string, string | null> = {};
      await Promise.all(list.map(async r => {
        map[r.id] = await nextOccurrenceISO(r);
      }));
      setNextDates(map);
    } catch {
      toast.error('고정비를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setForm(emptyForm(categories[0]?.value ?? 'other', (payments[0]?.value as FormState['payment_method']) ?? 'transfer'));
    setDialogOpen(true);
  };

  const openEdit = (r: RecurringExpense) => {
    setForm({
      id: r.id,
      item_name: r.item_name,
      category: r.category,
      unit_price: r.unit_price,
      quantity: r.quantity,
      payment_method: r.payment_method as FormState['payment_method'],
      vendor: r.vendor ?? '',
      note: r.note ?? '',
      frequency: r.frequency,
      interval_count: r.interval_count,
      day_of_week: r.day_of_week ?? null,
      day_of_month: r.day_of_month ?? null,
      month_of_year: r.month_of_year ?? null,
      start_date: r.start_date,
      end_date: r.end_date ?? '',
      auto_generate: r.auto_generate,
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.item_name.trim()) { toast.error('품명을 입력해주세요'); return; }
    if (form.unit_price <= 0) { toast.error('단가를 입력해주세요'); return; }
    setSaving(true);
    try {
      const payload = {
        item_name: form.item_name.trim(),
        category: form.category,
        unit_price: form.unit_price,
        quantity: form.quantity,
        payment_method: form.payment_method,
        vendor: form.vendor.trim() || null,
        note: form.note.trim() || null,
        frequency: form.frequency,
        interval_count: form.interval_count,
        day_of_week: form.frequency === 'weekly' ? form.day_of_week : null,
        day_of_month: form.frequency !== 'weekly' ? form.day_of_month : null,
        month_of_year: form.frequency === 'yearly' ? form.month_of_year : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        auto_generate: form.auto_generate,
        is_active: form.is_active,
      };
      if (form.id) {
        await updateRecurringExpense(form.id, payload);
        toast.success('고정비가 수정되었습니다');
      } else {
        await createRecurringExpense(payload);
        toast.success('고정비가 등록되었습니다');
      }
      setDialogOpen(false);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (r: RecurringExpense) => {
    try {
      await toggleRecurringExpenseActive(r.id, !r.is_active);
      toast.success(r.is_active ? '일시정지되었습니다' : '재개되었습니다');
      refresh();
    } catch {
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecurringExpense(deleteTarget.id);
      toast.success('고정비가 삭제되었습니다');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  const categoryColor = (value: string) => categories.find(c => c.value === value)?.color ?? '#9ca3af';
  const categoryLabel = (value: string) => categories.find(c => c.value === value)?.label ?? value;
  const paymentLabel = (value: string) => payments.find(p => p.value === value)?.label ?? value;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-foreground">고정비 관리</h3>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" />추가
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">월세·인터넷·구독료처럼 반복되는 지출을 등록해두면 매월 자동으로 추가되거나 한 번에 빠르게 등록할 수 있어요</p>

        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">등록된 고정비가 없습니다</div>
        ) : (
          <div className="space-y-2">
            {items.map(r => (
              <div key={r.id} className={`rounded-lg border p-3 ${r.is_active ? 'bg-background' : 'bg-muted/40 opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{r.item_name}</span>
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: `${categoryColor(r.category)}40`, color: categoryColor(r.category) }}>{categoryLabel(r.category)}</span>
                      {!r.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">일시정지</span>}
                      {!r.auto_generate && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">수동</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{ruleSummary(r)}</span>
                      <span>₩{(r.unit_price * r.quantity).toLocaleString()}</span>
                      <span>{paymentLabel(r.payment_method)}</span>
                      {nextDates[r.id] && <span>다음: {nextDates[r.id]}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(r)} aria-label={r.is_active ? '일시정지' : '재개'}>
                      {r.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)} aria-label="수정">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} aria-label="삭제">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 등록/수정 다이얼로그 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form?.id ? '고정비 수정' : '고정비 등록'}</DialogTitle>
            </DialogHeader>
            {form && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="re-name">품명 *</Label>
                  <Input id="re-name" value={form.item_name} onChange={e => setForm(f => f && { ...f, item_name: e.target.value })} placeholder="예: 월세, 인터넷, 넷플릭스" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>카테고리 *</Label>
                    <Select value={form.category} onValueChange={(v) => setForm(f => f && { ...f, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>결제방식 *</Label>
                    <Select value={form.payment_method} onValueChange={(v) => setForm(f => f && { ...f, payment_method: v as FormState['payment_method'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {payments.map(p => <SelectItem key={p.id} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>단가 *</Label>
                    <AmountInput name="unit_price" value={form.unit_price} onChange={(v) => setForm(f => f && { ...f, unit_price: v })} />
                  </div>
                  <div>
                    <Label>수량</Label>
                    <Input type="number" inputMode="numeric" value={form.quantity} min={1} onChange={e => setForm(f => f && { ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                  </div>
                </div>

                <div>
                  <Label>거래처</Label>
                  <Input value={form.vendor} onChange={e => setForm(f => f && { ...f, vendor: e.target.value })} placeholder="선택 입력" />
                </div>

                {/* 반복 규칙 */}
                <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">반복 규칙</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Select value={form.frequency} onValueChange={(v) => setForm(f => f && { ...f, frequency: v as RecurringFrequency })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                        <SelectItem value="yearly">매년</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">매</span>
                      <Input type="number" inputMode="numeric" min={1} max={99} value={form.interval_count} onChange={e => setForm(f => f && { ...f, interval_count: Math.max(1, parseInt(e.target.value) || 1) })} className="text-center" />
                      <span className="text-xs text-muted-foreground">{form.frequency === 'weekly' ? '주' : form.frequency === 'monthly' ? '개월' : '년'}</span>
                    </div>
                  </div>

                  {form.frequency === 'weekly' && (
                    <div>
                      <Label className="text-xs">요일 *</Label>
                      <div className="flex gap-1 mt-1">
                        {WEEKDAY_LABELS.map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setForm(f => f && { ...f, day_of_week: i })}
                            className={`flex-1 h-9 text-xs rounded-md border transition-colors ${form.day_of_week === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.frequency === 'monthly' && (
                    <div>
                      <Label className="text-xs">매월 며칠 *</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input type="number" inputMode="numeric" min={1} max={31} value={form.day_of_month ?? ''} onChange={e => setForm(f => f && { ...f, day_of_month: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="w-20" />
                        <span className="text-xs text-muted-foreground">일 (해당 월에 그 날짜가 없으면 마지막날 적용)</span>
                      </div>
                    </div>
                  )}

                  {form.frequency === 'yearly' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">월 *</Label>
                        <Input type="number" inputMode="numeric" min={1} max={12} value={form.month_of_year ?? ''} onChange={e => setForm(f => f && { ...f, month_of_year: Math.min(12, Math.max(1, parseInt(e.target.value) || 1)) })} />
                      </div>
                      <div>
                        <Label className="text-xs">일 *</Label>
                        <Input type="number" inputMode="numeric" min={1} max={31} value={form.day_of_month ?? ''} onChange={e => setForm(f => f && { ...f, day_of_month: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">시작일</Label>
                      <Input type="date" value={form.start_date} onChange={e => setForm(f => f && { ...f, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">종료일 (선택)</Label>
                      <Input type="date" value={form.end_date} onChange={e => setForm(f => f && { ...f, end_date: e.target.value })} />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.auto_generate} onChange={e => setForm(f => f && { ...f, auto_generate: e.target.checked })} />
                    <span>자동 생성 (매 주기마다 자동으로 지출 등록)</span>
                  </label>
                </div>

                <div>
                  <Label>비고</Label>
                  <Input value={form.note} onChange={e => setForm(f => f && { ...f, note: e.target.value })} placeholder="메모" maxLength={100} />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
                  <Button type="submit" disabled={saving}>{saving ? '저장중...' : '저장'}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 */}
        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>고정비 삭제</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{deleteTarget?.item_name}</span> 고정비를 삭제하시겠어요? 이미 등록된 지출 내역은 삭제되지 않습니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button variant="destructive" onClick={handleDelete}>삭제</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
