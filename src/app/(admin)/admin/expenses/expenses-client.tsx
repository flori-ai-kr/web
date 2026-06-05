'use client';

import {useCallback, useEffect, useMemo, useOptimistic, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/layout/PageHeader';
import {Card, CardContent} from '@/components/ui/card';
import {DomainBadge} from '@/components/ui/domain-badge';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {AmountInput} from '@/components/ui/amount-input';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {
    CalendarCheck,
    Loader2,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Settings,
    Trash2,
} from 'lucide-react';
import {ExpensesList} from './components/ExpensesList';
import {CategoryMultiSelect} from '@/components/ui/category-multi-select';
import {QuickAddRecurring} from '@/components/expenses/quick-add-recurring';
import {RecurringExpensesSection} from '@/components/expenses/recurring-expenses-section';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import {
  deleteExpenseInstanceOnly,
  deleteRecurringFromInstance,
  updateExpenseInstanceOnly,
  updateRecurringFromInstance,
} from '@/lib/actions/recurring-expenses';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {toast} from 'sonner';
import {createExpense, deleteExpense, getExpenseSuggestions, updateExpense} from '@/lib/actions/expenses';
import {
    ExpenseCategory,
    ExpensePaymentMethod,
    getExpenseCategories,
    getExpensePaymentMethods
} from '@/lib/actions/expense-settings';
import {ExpenseSettingsModal} from '@/components/expenses/ExpenseSettingsModal';
import {cn, formatCurrency} from '@/lib/utils';
import {TODAY_FILTER_ACTIVE_CLASS} from '@/lib/constants';
import type {Expense} from '@/types/database';
import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';

const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => 2024 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);


interface Props {
  initialExpenses: Expense[];
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  initialCategories: ExpenseCategory[];
  initialPayments: ExpensePaymentMethod[];
  initialSelectedExpense?: Expense | null;
}

export function ExpensesClient({
  initialExpenses,
  currentYear,
  currentMonth,
  currentDay,
  initialCategories,
  initialPayments,
  initialSelectedExpense
}: Props) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(initialSelectedExpense || null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [noteValue, setNoteValue] = useState('');
  const [editNoteValue, setEditNoteValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [payments, setPayments] = useState<ExpensePaymentMethod[]>(initialPayments);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(initialPayments[0]?.value || 'card');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticExpenses, removeOptimisticExpense] = useOptimistic(
    initialExpenses,
    (list, deletedId: string) => list.filter((e) => e.id !== deletedId),
  );

  // 자동생성된(고정비) 지출 수정 시 "이것만 / 이후 모두" 분기
  const [pendingScopeEdit, setPendingScopeEdit] = useState<null | { expenseId: string; fields: Parameters<typeof updateExpenseInstanceOnly>[1] }>(null);
  const [scopeBusy, startScopeTransition] = useTransition();
  const [expenseSuggestions, setExpenseSuggestions] = useState<{ itemNames: string[]; vendors: string[]; memos: string[] }>({ itemNames: [], vendors: [], memos: [] });
  const [createItemName, setCreateItemName] = useState('');
  const [createVendor, setCreateVendor] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editVendor, setEditVendor] = useState('');

  // 폼/수정 다이얼로그 열릴 때 자동완성 데이터 로드
  useEffect(() => {
    if (isFormOpen || editingExpense) {
      getExpenseSuggestions().then(setExpenseSuggestions).catch(() => {});
    }
  }, [isFormOpen, editingExpense]);

  // 등록 폼 닫힐 때 controlled 값 초기화
  useEffect(() => {
    if (!isFormOpen) {
      setCreateItemName('');
      setCreateVendor('');
      setNoteValue('');
    }
  }, [isFormOpen]);

  // 수정 폼 열릴 때 controlled 값 초기화
  useEffect(() => {
    if (editingExpense) {
      setEditItemName(editingExpense.item_name);
      setEditVendor(editingExpense.vendor || '');
      setEditNoteValue(editingExpense.memo || '');
    }
  }, [editingExpense]);

  // 카테고리/결제방식 라벨 및 색상 맵 생성
  const categoryLabels = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.value, c.label])), [categories]);
  const categoryColors = useMemo(() =>
    Object.fromEntries(categories.map(c => [c.value, c.color])), [categories]);
  const paymentLabels = useMemo(() =>
    Object.fromEntries(payments.map(p => [p.value, p.label])), [payments]);
  const paymentColors = useMemo(() =>
    Object.fromEntries(payments.map(p => [p.value, p.color])), [payments]);

  // 설정 새로고침
  const refreshSettings = async () => {
    const [cats, pays] = await Promise.all([getExpenseCategories(), getExpensePaymentMethods()]);
    setCategories(cats);
    setPayments(pays);
  };

  const filteredExpenses = useMemo(() => {
    let result = optimisticExpenses;

    if (paymentFilter.length > 0) {
      result = result.filter(e => paymentFilter.includes(e.payment_method));
    }

    if (categoryFilter.length > 0) {
      result = result.filter(e => categoryFilter.includes(e.category));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.item_name.toLowerCase().includes(q) ||
        (e.vendor?.toLowerCase().includes(q)) ||
        (e.memo?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [optimisticExpenses, paymentFilter, categoryFilter, searchQuery]);

  const summary = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    filteredExpenses.forEach(e => {
      total += e.total_amount;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.total_amount;
    });
    return { total, byCategory };
  }, [filteredExpenses]);

  const yearLabel = currentYear === 0 ? '전체' : `${currentYear}년`;
  const monthLabel = currentMonth === 0 ? '전체' : `${currentMonth}월`;
  const dayLabel = currentDay === 0 ? '' : ` ${currentDay}일`;

  const getExportConfig = useCallback((): ExportConfig<Expense> => {
    const isAll = currentYear === 0 || currentMonth === 0;
    const monthSuffix = isAll ? '' : `_${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const daySuffix = currentDay === 0 ? '' : `-${String(currentDay).padStart(2, '0')}`;
    return ({
      filename: isAll ? '지출_전체' : `지출${monthSuffix}${daySuffix}`,
      title: `지출 내역 (${yearLabel} ${monthLabel}${dayLabel})`,
      columns: [
        { header: '날짜', accessor: (e) => String(e.date || '') },
        { header: '카테고리', accessor: (e) => categoryLabels[e.category] || e.category || '' },
        { header: '금액', accessor: (e) => Number(e.total_amount) || 0, format: 'currency' },
        { header: '결제방법', accessor: (e) => paymentLabels[e.payment_method] || e.payment_method || '' },
        { header: '수량', accessor: (e) => Number(e.quantity) || 0 },
        { header: '품목명', accessor: (e) => String(e.item_name || '') },
        { header: '거래처', accessor: (e) => String(e.vendor || '') },
        { header: '메모', accessor: (e) => String(e.memo || '') },
      ],
      data: filteredExpenses,
    });
  }, [filteredExpenses, currentYear, currentMonth, currentDay, yearLabel, monthLabel, dayLabel, categoryLabels, paymentLabels]);

  const handleSelectExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();
  const isDayDisabled = yearParam === 'all' || monthParam === 'all';

  const buildUrl = useCallback((overrides: Record<string, string> = {}) => {
    const p = {
      year: yearParam,
      month: monthParam,
      day: dayParam,
      ...overrides,
    };
    if (p.year === 'all' || p.month === 'all') p.day = 'all';
    const params = new URLSearchParams();
    params.set('year', p.year);
    params.set('month', p.month);
    if (p.day !== 'all') params.set('day', p.day);
    return `/admin/expenses?${params.toString()}`;
  }, [yearParam, monthParam, dayParam]);

  const handleYearChange = (year: string) => {
    router.push(buildUrl({ year, day: 'all' }));
  };

  const handleMonthChange = (month: string) => {
    router.push(buildUrl({ month, day: 'all' }));
  };

  const handleDayChange = (day: string) => {
    router.push(buildUrl({ day }));
  };

  const handleTodayOnly = () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString();
    const d = now.getDate().toString();
    router.push(buildUrl({ year: y, month: m, day: d }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSubmitTransition(async () => {
      try {
        await createExpense(formData);

        setIsFormOpen(false);
        router.refresh();
        toast.success('지출이 등록되었습니다');
      } catch (error) {
        console.error('Failed to create expense:', error);
        toast.error('지출 등록에 실패했습니다');
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;

    const formData = new FormData(e.currentTarget);
    const isRecurringInstance = !!editingExpense.recurring_id;

    if (isRecurringInstance) {
      // 분기 다이얼로그를 위해 필드를 stash
      const unitPrice = parseInt(formData.get('unit_price') as string) || 0;
      const quantity = parseInt(formData.get('quantity') as string) || 1;
      const fields = {
        date: String(formData.get('date') ?? editingExpense.date),
        item_name: String(formData.get('item_name') ?? ''),
        category: String(formData.get('category') ?? ''),
        unit_price: unitPrice,
        quantity,
        payment_method: String(formData.get('payment_method') ?? '') as 'cash' | 'card' | 'transfer' | 'naverpay' | 'kakaopay',
        vendor: (formData.get('vendor') as string) || null,
        note: (formData.get('note') as string) || null,
      };
      setPendingScopeEdit({ expenseId: editingExpense.id, fields });
      return;
    }

    const target = editingExpense;
    startSubmitTransition(async () => {
      try {
        await updateExpense(target.id, formData);
        setEditingExpense(null);
        setSelectedExpense(null);
        router.refresh();
        toast.success('지출이 수정되었습니다');
      } catch (error) {
        console.error('Failed to update expense:', error);
        toast.error('지출 수정에 실패했습니다');
      }
    });
  };

  const handleScopeEditConfirm = (scope: 'instance' | 'future') => {
    if (!pendingScopeEdit) return;
    const pending = pendingScopeEdit;
    startScopeTransition(async () => {
      try {
        if (scope === 'instance') {
          await updateExpenseInstanceOnly(pending.expenseId, pending.fields);
          toast.success('이 항목만 수정되었습니다');
        } else {
          await updateRecurringFromInstance(pending.expenseId, pending.fields);
          toast.success('이후 모든 항목에 반영되었습니다');
        }
        setPendingScopeEdit(null);
        setEditingExpense(null);
        setSelectedExpense(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '수정에 실패했습니다');
      }
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setEditNoteValue(expense.memo || '');
    setEditPaymentMethod(expense.payment_method);
    setSelectedExpense(null);
  };

  const handleDelete = (expense: Expense) => {
    setDeleteTarget(expense);
  };

  const confirmDelete = (scope?: 'instance' | 'future') => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSelectedExpense(null);
    startDeleteTransition(async () => {
      removeOptimisticExpense(target.id);
      // '이후 모두 삭제'는 같은 고정비의 이후 날짜 인스턴스도 함께 사라지므로 낙관적으로 같이 제거
      if (target.recurring_id && scope === 'future') {
        optimisticExpenses
          .filter((e) => e.recurring_id === target.recurring_id && e.date > target.date)
          .forEach((e) => removeOptimisticExpense(e.id));
      }
      try {
        if (target.recurring_id && scope === 'instance') {
          await deleteExpenseInstanceOnly(target.id);
          toast.success('이 항목만 삭제되었습니다');
        } else if (target.recurring_id && scope === 'future') {
          await deleteRecurringFromInstance(target.id);
          toast.success('이후 모든 반복이 종료되었습니다');
        } else {
          await deleteExpense(target.id);
          toast.success('지출이 삭제되었습니다');
        }
        router.refresh();
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('지출 삭제에 실패했습니다');
      }
    });
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <ExportButton getExportConfig={getExportConfig} className="flex-1 sm:flex-initial" />
        <Button onClick={() => { setIsFormOpen(true); setNoteValue(''); setSelectedPaymentMethod(payments[0]?.value || 'card'); }} className="flex-1 sm:flex-initial">
          <Plus className="w-4 h-4 mr-2" />
          지출 등록
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">내역</TabsTrigger>
          <TabsTrigger value="recurring">고정비</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-4">
          {/* Quick Add (고정비) */}
          <QuickAddRecurring />

          {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총 지출</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        {Object.entries(summary.byCategory).slice(0, 3).map(([cat, amount]) => (
          <Card key={cat}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{categoryLabels[cat]}</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(amount)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={yearParam} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {YEAR_OPTIONS.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthParam} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[80px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {MONTH_OPTIONS.map(month => (
              <SelectItem key={month} value={month.toString()}>{month}월</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dayParam} onValueChange={handleDayChange} disabled={isDayDisabled}>
          <SelectTrigger className="w-[80px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {DAY_OPTIONS.map(day => (
              <SelectItem key={day} value={day.toString()}>{day}일</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CategoryMultiSelect
          options={categories.map(c => ({ value: c.value, label: c.label, color: c.color }))}
          selected={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="카테고리"
        />
        <CategoryMultiSelect
          options={payments.map(pm => ({ value: pm.value, label: pm.label, color: pm.color }))}
          selected={paymentFilter}
          onChange={setPaymentFilter}
          placeholder="결제방식"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="지출 설정"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </Button>
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
            aria-label="지출 검색"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={TODAY_FILTER_ACTIVE_CLASS}
          onClick={handleTodayOnly}
          aria-label="오늘 지출만 보기"
        >
          <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
          오늘만
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-9 shrink-0"
          onClick={() => {
            setSearchQuery('');
            setPaymentFilter([]);
            setCategoryFilter([]);
            router.push('/admin/expenses');
          }}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          초기화
        </Button>
      </div>

      {/* Expenses List */}
      <ExpensesList
        expenses={filteredExpenses}
        categoryLabels={categoryLabels}
        categoryColors={categoryColors}
        paymentLabels={paymentLabels}
        paymentColors={paymentColors}
        hasActiveFilters={paymentFilter.length > 0 || categoryFilter.length > 0 || searchQuery !== ''}
        onSelectExpense={handleSelectExpense}
        onResetFilters={() => { setPaymentFilter([]); setCategoryFilter([]); setSearchQuery(''); }}
        onOpenForm={() => { setIsFormOpen(true); setNoteValue(''); setSelectedPaymentMethod(payments[0]?.value || 'card'); }}
      />
        </TabsContent>

        <TabsContent value="recurring" className="mt-4">
          <RecurringExpensesSection />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">지출 등록</DialogTitle>
            <p className="text-sm text-muted-foreground">꽃 구매, 배달비 등 지출 내역을 입력해주세요. 총액은 단가 x 수량으로 자동 계산돼요.</p>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-5 pt-2">
            <div className="grid grid-cols-[3fr_2fr] gap-4">
              <div className="space-y-2">
                <Label>날짜 *</Label>
                <Input type="date" name="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select name="category" defaultValue={categories[0]?.value || 'flower_purchase'}>
                  <SelectTrigger className="bg-muted">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>물품명 *</Label>
              <SuggestionInput
                name="item_name"
                value={createItemName}
                onChange={setCreateItemName}
                suggestions={expenseSuggestions.itemNames}
                placeholder="예: 장미 50송이, 배달비"
                required
              />
              <p className="text-[11px] text-muted-foreground">어디서 뭘 샀는지 적어주세요</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>단가 *</Label>
                <AmountInput name="unit_price" placeholder="0" required className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>수량</Label>
                <Input type="number" name="quantity" defaultValue="1" min="1" className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>결제방식 *</Label>
              <input type="hidden" name="payment_method" value={selectedPaymentMethod} />
              <div className="flex flex-wrap gap-2">
                {payments.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      selectedPaymentMethod === pm.value
                        ? "ring-2 ring-offset-1 ring-brand/50"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    )}
                    style={selectedPaymentMethod === pm.value ? { backgroundColor: `${pm.color}20`, color: pm.color, borderColor: pm.color } : {}}
                    onClick={() => setSelectedPaymentMethod(pm.value)}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>거래처</Label>
              <SuggestionInput
                name="vendor"
                value={createVendor}
                onChange={setCreateVendor}
                suggestions={expenseSuggestions.vendors}
                placeholder="예: 고속터미널 꽃시장"
              />
              <p className="text-[11px] text-muted-foreground">어디서 구매했는지 적어두면 나중에 찾기 편해요</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>메모</Label>
                <span className={cn("text-xs", noteValue.length > 200 ? "text-danger" : "text-muted-foreground")}>
                  {noteValue.length}/200
                </span>
              </div>
              <SuggestionInput
                name="memo"
                value={noteValue}
                onChange={setNoteValue}
                suggestions={expenseSuggestions.memos}
                placeholder="메모를 입력하세요"
                maxLength={200}
                multiline
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>취소</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? '저장 중...' : '저장'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">지출 상세</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">날짜</p>
                  <p className="font-medium">{format(new Date(selectedExpense.date), 'yyyy년 M월 d일', { locale: ko })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">총액</p>
                  <p className="font-bold text-lg text-brand">{formatCurrency(selectedExpense.total_amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">물품명</p>
                  <p className="font-medium">{selectedExpense.item_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">카테고리</p>
                  <DomainBadge color={categoryColors[selectedExpense.category]} className="px-2 py-1">
                    {categoryLabels[selectedExpense.category] || selectedExpense.category}
                  </DomainBadge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">결제방식</p>
                  <DomainBadge color={paymentColors[selectedExpense.payment_method]} className="px-2 py-1">
                    {paymentLabels[selectedExpense.payment_method] || selectedExpense.payment_method}
                  </DomainBadge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">단가 x 수량 = 총액</p>
                  <p className="font-medium">{formatCurrency(selectedExpense.unit_price)} x {selectedExpense.quantity} = {formatCurrency(selectedExpense.total_amount)}</p>
                </div>
              </div>

              {selectedExpense.vendor && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">거래처</p>
                  <p className="font-medium">{selectedExpense.vendor}</p>
                </div>
              )}

              {selectedExpense.memo && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-sm text-muted-foreground">메모</p>
                  <p className="text-foreground">{selectedExpense.memo}</p>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleEdit(selectedExpense)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    onClick={() => handleDelete(selectedExpense)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                </div>
                <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">지출 수정</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(e); }} className="space-y-5 pt-2">
              <div className="grid grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label>날짜 *</Label>
                  <Input type="date" name="date" defaultValue={editingExpense.date} required className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>카테고리 *</Label>
                  <Select name="category" defaultValue={editingExpense.category} key={`cat-${editingExpense.id}`}>
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>물품명 *</Label>
                <SuggestionInput
                  name="item_name"
                  value={editItemName}
                  onChange={setEditItemName}
                  suggestions={expenseSuggestions.itemNames}
                  placeholder="물품명"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>단가 *</Label>
                  <AmountInput name="unit_price" value={editingExpense.unit_price} required className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input type="number" name="quantity" defaultValue={editingExpense.quantity} min="1" className="bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>결제방식 *</Label>
                <input type="hidden" name="payment_method" value={editPaymentMethod} />
                <div className="flex flex-wrap gap-2">
                  {payments.map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        editPaymentMethod === pm.value
                          ? "ring-2 ring-offset-1 ring-brand/50"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                      style={editPaymentMethod === pm.value ? { backgroundColor: `${pm.color}20`, color: pm.color, borderColor: pm.color } : {}}
                      onClick={() => setEditPaymentMethod(pm.value)}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>거래처</Label>
                <SuggestionInput
                  name="vendor"
                  value={editVendor}
                  onChange={setEditVendor}
                  suggestions={expenseSuggestions.vendors}
                  placeholder="거래처명"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>메모</Label>
                  <span className={cn("text-xs", editNoteValue.length > 200 ? "text-danger" : "text-muted-foreground")}>
                    {editNoteValue.length}/200
                  </span>
                </div>
                <SuggestionInput
                  name="memo"
                  value={editNoteValue}
                  onChange={setEditNoteValue}
                  suggestions={expenseSuggestions.memos}
                  placeholder="메모를 입력하세요"
                  maxLength={200}
                  multiline
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>취소</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{deleteTarget?.recurring_id ? '반복되는 지출입니다' : '지출 삭제'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {deleteTarget && (
              <p className="text-muted-foreground text-xs mb-3">
                {format(new Date(deleteTarget.date), 'M월 d일', { locale: ko })} · {deleteTarget.item_name} · {formatCurrency(deleteTarget.total_amount)}
              </p>
            )}
            <p className="text-muted-foreground text-sm">
              {deleteTarget?.recurring_id
                ? '고정비 자동생성으로 등록된 지출이에요. 어떻게 삭제할까요?'
                : '이 지출 기록을 삭제하시겠습니까?'}
            </p>
          </div>
          {deleteTarget?.recurring_id ? (
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={() => confirmDelete('instance')}>
                이 항목만 삭제
              </Button>
              <Button variant="destructive" onClick={() => confirmDelete('future')}>
                이후 모두 삭제
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
              <Button variant="destructive" onClick={() => confirmDelete()}>
                삭제
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 자동생성된 지출 수정 — 이것만 / 이후 모두 분기 */}
      <Dialog open={!!pendingScopeEdit} onOpenChange={(open) => !open && setPendingScopeEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반복되는 지출입니다</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            고정비 자동생성으로 등록된 지출이에요. 어떻게 저장할까요?
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleScopeEditConfirm('instance')} disabled={scopeBusy}>
              {scopeBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              이 항목만 저장
            </Button>
            <Button onClick={() => handleScopeEditConfirm('future')} disabled={scopeBusy}>
              {scopeBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              이후 모두 저장 (고정비 템플릿 변경)
            </Button>
            <Button variant="outline" onClick={() => setPendingScopeEdit(null)} disabled={scopeBusy}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Settings Modal */}
      <ExpenseSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        onRefresh={refreshSettings}
      />
    </div>
  );
}
