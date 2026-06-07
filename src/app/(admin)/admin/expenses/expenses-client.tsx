'use client';

import {useCallback, useEffect, useOptimistic, useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {AmountInput} from '@/components/ui/amount-input';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {DatePicker} from '@/components/ui/date-picker';
import {Loader2, Pencil, Plus, Repeat, Settings, Trash2} from 'lucide-react';
import {ExpensesList} from './components/ExpensesList';
import {ExpensesFiltersUI} from './components/ExpensesFilters';
import {ExpensesSummary} from './components/ExpensesSummary';
import {QuickAddRecurring} from '@/components/expenses/quick-add-recurring';
import {RecurringExpensesSection} from '@/components/expenses/recurring-expenses-section';
import {
  deleteExpenseInstanceOnly,
  deleteRecurringFromInstance,
  updateExpenseInstanceOnly,
  updateRecurringFromInstance,
} from '@/lib/actions/recurring-expenses';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {toast} from 'sonner';
import {
  createExpense,
  deleteExpense,
  getExpenseSuggestions,
  loadMoreExpenses,
  updateExpense,
} from '@/lib/actions/expenses';
import type {ExpenseCategorySlice, ExpenseFilters} from '@/lib/actions/expenses';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  getExpenseCategories,
  getExpensePaymentMethods,
} from '@/lib/actions/expense-settings';
import {ExpenseSettingsModal} from '@/components/expenses/ExpenseSettingsModal';
import {cn, formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';
import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';

interface ExpensesSummaryData {
  total: number;
  count: number;
  byCategory: ExpenseCategorySlice[];
}

interface Props {
  initialExpenses: Expense[];
  initialHasMore: boolean;
  initialSummary: ExpensesSummaryData;
  prevTotal?: number | null;
  prevPeriod?: { startDate: string; endDate: string } | null;
  monthParam: string | null;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  initialCategories: ExpenseCategory[];
  initialPayments: ExpensePaymentMethod[];
  initialFilters: ExpenseFilters;
  initialSelectedExpense?: Expense | null;
}

export function ExpensesClient({
  initialExpenses,
  initialHasMore,
  initialSummary,
  prevTotal,
  prevPeriod,
  monthParam: serverMonthParam,
  currentYear,
  currentMonth,
  currentDay,
  initialCategories,
  initialPayments,
  initialFilters,
  initialSelectedExpense,
}: Props) {
  const router = useRouter();
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(initialSelectedExpense || null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  // 필터는 URL 파라미터 기반(서버 쿼리에 반영)
  const categoryFilter: string[] = initialFilters.category ?? [];
  const paymentFilter: string[] = initialFilters.payment ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [noteValue, setNoteValue] = useState('');
  const [editNoteValue, setEditNoteValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [payments, setPayments] = useState<ExpensePaymentMethod[]>(initialPayments);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(initialPayments[0]?.id ?? '');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 자동생성된(고정비) 지출 수정 시 "이것만 / 이후 모두" 분기
  const [pendingScopeEdit, setPendingScopeEdit] = useState<null | { expenseId: string; fields: Parameters<typeof updateExpenseInstanceOnly>[1] }>(null);
  const [scopeBusy, startScopeTransition] = useTransition();
  const [expenseSuggestions, setExpenseSuggestions] = useState<{ itemNames: string[]; vendors: string[]; memos: string[] }>({ itemNames: [], vendors: [], memos: [] });
  const [createItemName, setCreateItemName] = useState('');
  const [createVendor, setCreateVendor] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editVendor, setEditVendor] = useState('');

  // 무한스크롤 상태
  const [allExpenses, setAllExpenses] = useState<Expense[]>(initialExpenses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const dataVersionRef = useRef(0);

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticExpenses, removeOptimisticExpense] = useOptimistic(
    allExpenses,
    (list, deletedId: string) => list.filter((e) => e.id !== deletedId),
  );

  const summary = initialSummary;

  // initialExpenses 변경(년/월/필터) 시 리셋
  useEffect(() => {
    dataVersionRef.current += 1;
    setAllExpenses(initialExpenses);
    setHasMore(initialHasMore);
    setIsLoadingMore(false);
  }, [initialExpenses, initialHasMore]);

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

  // 검색어 디바운스 → 서버사이드 검색
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filtersKey = `${(initialFilters.category ?? []).join(',')}-${(initialFilters.payment ?? []).join(',')}`;

  useEffect(() => {
    if (debouncedSearch === '') {
      setIsSearching(false);
      dataVersionRef.current += 1;
      setAllExpenses(initialExpenses);
      setHasMore(initialHasMore);
      return;
    }
    const version = ++searchVersionRef.current;
    setIsSearching(true);
    loadMoreExpenses(serverMonthParam, 0, { ...initialFilters, search: debouncedSearch })
      .then(result => {
        if (version !== searchVersionRef.current) return;
        dataVersionRef.current += 1;
        setAllExpenses(result.expenses);
        setHasMore(result.hasMore);
      })
      .catch(() => {
        toast.error('검색에 실패했습니다');
      })
      .finally(() => {
        if (version === searchVersionRef.current) setIsSearching(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, serverMonthParam, filtersKey, initialExpenses, initialHasMore]);

  const filteredExpenses = optimisticExpenses;
  const hasActiveFilters = paymentFilter.length > 0 || categoryFilter.length > 0 || searchQuery !== '';

  const yearLabel = currentYear === 0 ? '전체' : `${currentYear}년`;
  const monthLabel = currentMonth === 0 ? '전체' : `${currentMonth}월`;
  const dayLabel = currentDay === 0 ? '' : ` ${currentDay}일`;

  const refreshSettings = async () => {
    const [cats, pays] = await Promise.all([getExpenseCategories(), getExpensePaymentMethods()]);
    setCategories(cats);
    setPayments(pays);
  };

  const getExportConfig = useCallback((): ExportConfig<Expense> => {
    const isAll = currentYear === 0 || currentMonth === 0;
    const monthSuffix = isAll ? '' : `_${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const daySuffix = currentDay === 0 ? '' : `-${String(currentDay).padStart(2, '0')}`;
    return ({
      filename: isAll ? '지출_전체' : `지출${monthSuffix}${daySuffix}`,
      title: `지출 내역 (${yearLabel} ${monthLabel}${dayLabel})`,
      columns: [
        { header: '날짜', accessor: (e) => String(e.date || '') },
        { header: '카테고리', accessor: (e) => e.category_label || '' },
        { header: '금액', accessor: (e) => Number(e.total_amount) || 0, format: 'currency' },
        { header: '결제방법', accessor: (e) => e.payment_method_label ?? '' },
        { header: '수량', accessor: (e) => Number(e.quantity) || 0 },
        { header: '품목명', accessor: (e) => String(e.item_name || '') },
        { header: '거래처', accessor: (e) => String(e.vendor || '') },
        { header: '메모', accessor: (e) => String(e.memo || '') },
      ],
      data: filteredExpenses,
    });
  }, [filteredExpenses, currentYear, currentMonth, currentDay, yearLabel, monthLabel, dayLabel]);

  const handleSelectExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();

  const buildUrl = useCallback((overrides: {
    year?: string; month?: string; day?: string; category?: string[]; payment?: string[];
  } = {}) => {
    const p = {
      year: yearParam,
      month: monthParam,
      day: dayParam,
      category: categoryFilter,
      payment: paymentFilter,
      ...overrides,
    };
    if (p.year === 'all' || p.month === 'all') p.day = 'all';
    const params = new URLSearchParams();
    params.set('year', p.year);
    params.set('month', p.month);
    if (p.day !== 'all') params.set('day', p.day);
    if (p.category.length > 0) params.set('category', p.category.join(','));
    if (p.payment.length > 0) params.set('payment', p.payment.join(','));
    return `/admin/expenses?${params.toString()}`;
  }, [yearParam, monthParam, dayParam, categoryFilter, paymentFilter]);

  const handleMonthNav = (direction: -1 | 1) => {
    let y = currentYear || new Date().getFullYear();
    let m = currentMonth || new Date().getMonth() + 1;
    m += direction;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    router.push(buildUrl({ year: y.toString(), month: m.toString(), day: 'all' }));
  };

  const handleDateRangeApply = (startDate: string, endDate: string) => {
    const params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    if (categoryFilter.length > 0) params.set('category', categoryFilter.join(','));
    if (paymentFilter.length > 0) params.set('payment', paymentFilter.join(','));
    router.push(`/admin/expenses?${params.toString()}`);
  };

  const handleCategoryChange = (category: string[]) => {
    router.push(buildUrl({ category }));
  };

  const handlePaymentChange = (payment: string[]) => {
    router.push(buildUrl({ payment }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    router.push(buildUrl({ category: [], payment: [] }));
  };

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const version = dataVersionRef.current;
    const filters = debouncedSearch ? { ...initialFilters, search: debouncedSearch } : initialFilters;
    try {
      const result = await loadMoreExpenses(serverMonthParam, allExpenses.length, filters);
      if (version !== dataVersionRef.current) return;
      setAllExpenses(prev => [...prev, ...result.expenses]);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more expenses:', error);
    } finally {
      if (version === dataVersionRef.current) setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, serverMonthParam, allExpenses.length, initialFilters, debouncedSearch]);

  const handleOpenForm = () => {
    setIsFormOpen(true);
    setNoteValue('');
    setSelectedPaymentMethod(payments[0]?.id ?? '');
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
      const unitPrice = parseInt(formData.get('unit_price') as string) || 0;
      const quantity = parseInt(formData.get('quantity') as string) || 1;
      const fields = {
        date: String(formData.get('date') ?? editingExpense.date),
        item_name: String(formData.get('item_name') ?? ''),
        category_id: String(formData.get('category_id') ?? ''),
        unit_price: unitPrice,
        quantity,
        payment_method_id: String(formData.get('payment_method_id') ?? ''),
        vendor: (formData.get('vendor') as string) || null,
        note: (formData.get('memo') as string) || null,
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
    setEditPaymentMethod(expense.payment_method_id ?? '');
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
      if (target.recurring_id && scope === 'future') {
        allExpenses
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
        setAllExpenses((prev) => prev.filter((e) => e.id !== target.id));
        router.refresh();
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('지출 삭제에 실패했습니다');
      }
    });
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2 lg:-mx-6 xl:-mx-8">
      {/* 고정비 자동등록 안내 */}
      <QuickAddRecurring />

      {/* 필터(월네비+기간) → 요약 → 드롭다운/검색 — 매출과 동일 */}
      <ExpensesFiltersUI
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentDay={currentDay}
        categoryFilter={categoryFilter}
        paymentFilter={paymentFilter}
        searchQuery={searchQuery}
        categories={categories}
        payments={payments}
        onMonthNav={handleMonthNav}
        onDateRangeApply={handleDateRangeApply}
        onCategoryChange={handleCategoryChange}
        onPaymentChange={handlePaymentChange}
        onSearchChange={setSearchQuery}
        onReset={handleResetFilters}
      >
        <ExpensesSummary
          summary={summary}
          categories={categories}
          prevTotal={prevTotal ?? undefined}
          prevPeriod={prevPeriod ?? undefined}
        />
      </ExpensesFiltersUI>

      <ExpensesList
        expenses={filteredExpenses}
        hasActiveFilters={hasActiveFilters}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore || isSearching}
        onLoadMore={handleLoadMore}
        onSelectExpense={handleSelectExpense}
        onResetFilters={handleResetFilters}
        onOpenForm={handleOpenForm}
      />

      {/* 고정비 관리 모달 (FAB에서 진입) */}
      <Dialog open={isRecurringOpen} onOpenChange={setIsRecurringOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">고정비 관리</DialogTitle>
          </DialogHeader>
          <RecurringExpensesSection embedded />
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">지출 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-5 pt-2">
            <div className="grid grid-cols-[3fr_2fr] gap-4">
              <div className="space-y-2">
                <Label>날짜 *</Label>
                <DatePicker name="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
              </div>
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select name="category_id" defaultValue={categories[0]?.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>단가 *</Label>
                <AmountInput name="unit_price" placeholder="0" required />
              </div>
              <div className="space-y-2">
                <Label>수량</Label>
                <Input type="number" name="quantity" defaultValue="1" min="1" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2.5">총액은 단가 x 수량으로 자동 계산돼요.</p>
            <div className="space-y-2">
              <Label>결제방식 *</Label>
              <input type="hidden" name="payment_method_id" value={selectedPaymentMethod} />
              <div className="flex flex-wrap gap-2">
                {payments.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      selectedPaymentMethod === pm.id
                        ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    )}
                    onClick={() => setSelectedPaymentMethod(pm.id)}
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
        <DialogContent className="sm:max-w-md">
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
                  <p className="font-medium">{selectedExpense.category_label ?? '미분류'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">결제방식</p>
                  <p className="font-medium">{selectedExpense.payment_method_label ?? ''}</p>
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

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => handleEdit(selectedExpense)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-danger hover:text-danger hover:bg-danger/10"
                  onClick={() => handleDelete(selectedExpense)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">지출 수정</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(e); }} className="space-y-5 pt-2">
              <div className="grid grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label>날짜 *</Label>
                  <DatePicker name="date" defaultValue={editingExpense.date} required />
                </div>
                <div className="space-y-2">
                  <Label>카테고리 *</Label>
                  <Select name="category_id" defaultValue={editingExpense.category_id ?? undefined} key={`cat-${editingExpense.id}`}>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
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
                  <AmountInput name="unit_price" value={editingExpense.unit_price} required />
                </div>
                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input type="number" name="quantity" defaultValue={editingExpense.quantity} min="1" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2.5">총액은 단가 x 수량으로 자동 계산돼요.</p>
              <div className="space-y-2">
                <Label>결제방식 *</Label>
                <input type="hidden" name="payment_method_id" value={editPaymentMethod} />
                <div className="flex flex-wrap gap-2">
                  {payments.map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        editPaymentMethod === pm.id
                          ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                      onClick={() => setEditPaymentMethod(pm.id)}
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
        <DialogContent className="sm:max-w-sm">
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
        <DialogContent className="sm:max-w-sm">
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

      {/* FAB — Speed Dial */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { setFabOpen(false); handleOpenForm(); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-brand text-white text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              지출 등록
            </button>
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsRecurringOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            >
              <Repeat className="w-4 h-4" />
              고정비
            </button>
            <ExportButton
              getExportConfig={getExportConfig}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            />
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsSettingsOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            >
              <Settings className="w-4 h-4" />
              관리
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 ${
            fabOpen ? 'bg-muted-foreground rotate-45' : 'bg-brand'
          }`}
          aria-label="액션 메뉴"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
