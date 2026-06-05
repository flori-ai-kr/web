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
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
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
import type { RecurringExpense, RecurringFrequency, YearlyDate } from '@/types/database';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface FormState {
  id?: string;
  item_name: string;
  category_id: string;
  unit_price: number;
  quantity: number;
  payment_method_id: string;
  vendor: string;
  memo: string;
  frequency: RecurringFrequency;
  interval_count: number;
  days_of_week: number[];
  days_of_month: number[];
  yearly_dates: YearlyDate[];
  start_date: string;
  end_date: string;
  is_active: boolean;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm(defaultCategory: string, defaultPayment: string): FormState {
  const t = new Date();
  return {
    item_name: '',
    category_id: defaultCategory,
    unit_price: 0,
    quantity: 1,
    payment_method_id: defaultPayment,
    vendor: '',
    memo: '',
    frequency: 'monthly',
    interval_count: 1,
    days_of_week: [],
    days_of_month: [t.getDate()],
    yearly_dates: [],
    start_date: todayISO(),
    end_date: '',
    is_active: true,
  };
}

function ruleSummary(r: RecurringExpense): string {
  const prefix = r.interval_count > 1
    ? `${r.interval_count}${r.frequency === 'weekly' ? '주' : r.frequency === 'monthly' ? '개월' : '년'}마다`
    : r.frequency === 'weekly' ? '매주' : r.frequency === 'monthly' ? '매월' : '매년';

  if (r.frequency === 'weekly') {
    const sorted = (r.days_of_week ?? []).slice().sort((a, b) => a - b);
    return `${prefix} ${sorted.map(d => WEEKDAY_LABELS[d]).join('·')}요일`;
  }
  if (r.frequency === 'monthly') {
    const sorted = (r.days_of_month ?? []).slice().sort((a, b) => a - b);
    return `${prefix} ${sorted.join('·')}일`;
  }
  const dates = (r.yearly_dates ?? []).slice().sort((a, b) => (a.m - b.m) || (a.d - b.d));
  return `${prefix} ${dates.map(d => `${d.m}/${d.d}`).join(', ')}`;
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
    setForm(emptyForm(categories[0]?.id ?? '', payments[0]?.id ?? ''));
    setDialogOpen(true);
  };

  const openEdit = (r: RecurringExpense) => {
    setForm({
      id: r.id,
      item_name: r.item_name,
      category_id: r.category_id ?? '',
      unit_price: r.unit_price,
      quantity: r.quantity,
      payment_method_id: r.payment_method_id ?? '',
      vendor: r.vendor ?? '',
      memo: r.memo ?? '',
      frequency: r.frequency,
      interval_count: r.interval_count,
      days_of_week: r.days_of_week ?? [],
      days_of_month: r.days_of_month ?? [],
      yearly_dates: r.yearly_dates ?? [],
      start_date: r.start_date,
      end_date: r.end_date ?? '',
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.item_name.trim()) { toast.error('품명을 입력해주세요'); return; }
    if (form.unit_price <= 0) { toast.error('단가를 입력해주세요'); return; }
    if (form.frequency === 'weekly' && form.days_of_week.length === 0) { toast.error('반복할 요일을 선택해주세요'); return; }
    if (form.frequency === 'monthly' && form.days_of_month.length === 0) { toast.error('반복할 날짜를 선택해주세요'); return; }
    if (form.frequency === 'yearly' && form.yearly_dates.length === 0) { toast.error('반복할 일자를 추가해주세요'); return; }
    setSaving(true);
    try {
      const payload = {
        item_name: form.item_name.trim(),
        category_id: form.category_id,
        unit_price: form.unit_price,
        quantity: form.quantity,
        payment_method_id: form.payment_method_id,
        vendor: form.vendor.trim() || null,
        memo: form.memo.trim() || null,
        frequency: form.frequency,
        interval_count: form.interval_count,
        days_of_week: form.frequency === 'weekly' ? form.days_of_week : [],
        days_of_month: form.frequency === 'monthly' ? form.days_of_month : [],
        yearly_dates: form.frequency === 'yearly' ? form.yearly_dates : [],
        start_date: form.start_date,
        end_date: form.end_date || null,
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
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted-foreground/10">{r.category_label ?? '미분류'}</span>
                      {!r.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">일시정지</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{ruleSummary(r)}</span>
                      <span>₩{(r.unit_price * r.quantity).toLocaleString()}</span>
                      <span>{r.payment_method_label ?? ''}</span>
                      {r.vendor && <span>· {r.vendor}</span>}
                      {nextDates[r.id] && <span>다음: {nextDates[r.id]}</span>}
                    </div>
                    {r.memo && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{r.memo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.is_active}
                      aria-label={r.is_active ? '활성 (클릭해서 일시정지)' : '일시정지 (클릭해서 재개)'}
                      onClick={() => handleToggleActive(r)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        r.is_active ? 'bg-success' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          r.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)} aria-label="수정">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} aria-label="삭제">
                      <Trash2 className="w-4 h-4 text-danger" />
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
                className="space-y-5 pt-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="re-name">품명 *</Label>
                  <Input
                    id="re-name"
                    value={form.item_name}
                    onChange={e => setForm(f => f && { ...f, item_name: e.target.value })}
                    placeholder="예: 월세, 인터넷, 넷플릭스"
                    className="bg-muted"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>카테고리 *</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm(f => f && { ...f, category_id: v })}>
                      <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>결제방식 *</Label>
                    <Select value={form.payment_method_id} onValueChange={(v) => setForm(f => f && { ...f, payment_method_id: v })}>
                      <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {payments.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>단가 *</Label>
                    <AmountInput
                      name="unit_price"
                      value={form.unit_price}
                      onChange={(v) => setForm(f => f && { ...f, unit_price: v })}
                      placeholder="0"
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>수량</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={form.quantity}
                      min={1}
                      onChange={e => setForm(f => f && { ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>거래처</Label>
                  <Input
                    value={form.vendor}
                    onChange={e => setForm(f => f && { ...f, vendor: e.target.value })}
                    placeholder="예: 강남구청 관리실"
                    className="bg-muted"
                  />
                </div>

                {/* 반복 규칙 */}
                <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">반복 규칙</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">주기</Label>
                    <Select value={form.frequency} onValueChange={(v) => setForm(f => f && { ...f, frequency: v as RecurringFrequency })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                        <SelectItem value="yearly">매년</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">요일 * <span className="text-muted-foreground/70">(여러개 선택 가능)</span></Label>
                      <div className="flex gap-1.5">
                        {WEEKDAY_LABELS.map((d, i) => {
                          const selected = form.days_of_week.includes(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setForm(f => f && {
                                ...f,
                                days_of_week: selected ? f.days_of_week.filter(x => x !== i) : [...f.days_of_week, i],
                              })}
                              className={`flex-1 h-10 text-sm rounded-md border transition-colors ${selected ? 'bg-brand text-white border-brand' : 'bg-background hover:bg-accent'}`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {form.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">매월 * <span className="text-muted-foreground/70">(여러개 선택 가능)</span></Label>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                          const selected = form.days_of_month.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => setForm(f => f && {
                                ...f,
                                days_of_month: selected ? f.days_of_month.filter(x => x !== day) : [...f.days_of_month, day],
                              })}
                              className={`h-8 text-xs rounded-md border transition-colors ${selected ? 'bg-brand text-white border-brand' : 'bg-background hover:bg-accent'}`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">그 달에 해당 날짜가 없으면 마지막 날에 등록돼요</p>
                    </div>
                  )}

                  {form.frequency === 'yearly' && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">매년 일자 * <span className="text-muted-foreground/70">(여러개 추가 가능)</span></Label>
                      <div className="space-y-1.5">
                        {form.yearly_dates.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded-md">아래 [+ 일자 추가] 버튼으로 일자를 추가해주세요</p>
                        )}
                        {form.yearly_dates.map((yd, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={12}
                              value={yd.m}
                              onChange={e => {
                                const m = Math.min(12, Math.max(1, parseInt(e.target.value) || 1));
                                setForm(f => f && {
                                  ...f,
                                  yearly_dates: f.yearly_dates.map((x, i) => i === idx ? { ...x, m } : x),
                                });
                              }}
                              className="w-16 text-center bg-background"
                            />
                            <span className="text-sm">월</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={31}
                              value={yd.d}
                              onChange={e => {
                                const d = Math.min(31, Math.max(1, parseInt(e.target.value) || 1));
                                setForm(f => f && {
                                  ...f,
                                  yearly_dates: f.yearly_dates.map((x, i) => i === idx ? { ...x, d } : x),
                                });
                              }}
                              className="w-16 text-center bg-background"
                            />
                            <span className="text-sm">일</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setForm(f => f && {
                                ...f,
                                yearly_dates: f.yearly_dates.filter((_, i) => i !== idx),
                              })}
                              aria-label="일자 삭제"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setForm(f => f && {
                            ...f,
                            yearly_dates: [...f.yearly_dates, { m: new Date().getMonth() + 1, d: new Date().getDate() }],
                          })}
                          className="w-full"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />일자 추가
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">시작일</Label>
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={e => setForm(f => f && { ...f, start_date: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">종료일 (선택)</Label>
                      <Input
                        type="date"
                        value={form.end_date}
                        onChange={e => setForm(f => f && { ...f, end_date: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">매 주기마다 자동으로 지출 내역에 추가돼요. 일시정지하려면 카드 우측의 토글을 사용하세요.</p>
                </div>

                <div className="space-y-2">
                  <Label>비고</Label>
                  <Input
                    value={form.memo}
                    onChange={e => setForm(f => f && { ...f, memo: e.target.value })}
                    placeholder="메모"
                    maxLength={100}
                    className="bg-muted"
                  />
                </div>

                <DialogFooter className="gap-2">
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
