'use client';

import {useCallback, useOptimistic, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Pencil, Plus, Repeat, Settings, Trash2} from 'lucide-react';
import {ExpensesList} from './components/ExpensesList';
import {ExpensesFiltersUI} from './components/ExpensesFilters';
import {ExpensesSummary} from './components/ExpensesSummary';
import {ExpenseFormDialog} from './components/expense-form-dialog';
import {ExpenseEditDialog} from './components/expense-edit-dialog';
import {useExpenseForm} from './hooks/use-expense-form';
import {RecurringExpensesSection} from '@/components/expenses/recurring-expenses-section';
import {
  deleteExpenseInstanceOnly,
  deleteRecurringFromInstance,
} from '@/lib/actions/recurring-expenses';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {toast} from 'sonner';
import {deleteExpense, loadMoreExpenses} from '@/lib/actions/expenses';
import type {ExpenseFilters} from '@/lib/actions/expenses';
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
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {useQuickCreate} from '@/hooks/use-quick-create';

interface ExpensesSummaryData {
  total: number;
}

interface Props {
  initialExpenses: Expense[];
  initialHasMore: boolean;
  initialSummary: ExpensesSummaryData;
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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(initialSelectedExpense || null);
  // 필터는 URL 파라미터 기반(서버 쿼리에 반영)
  const categoryFilter: string[] = initialFilters.category ?? [];
  const paymentFilter: string[] = initialFilters.payment ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [payments, setPayments] = useState<ExpensePaymentMethod[]>(initialPayments);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [, startDeleteTransition] = useTransition();

  // 등록/수정 폼 상태 + 제출 + 고정비 '이것만/이후 모두' 분기
  const form = useExpenseForm({ payments, onCloseDetail: () => setSelectedExpense(null) });

  // 무한스크롤 + 디바운스 검색 (공용 훅 — 리셋·stale 가드 포함)
  const {
    items: allExpenses,
    setItems: setAllExpenses,
    hasMore,
    isLoadingMore,
    isSearching,
    loadMore: handleLoadMore,
  } = useInfiniteList<Expense>({
    initialItems: initialExpenses,
    initialHasMore,
    loadPage: async (offset, search) => {
      const filters = search ? { ...initialFilters, search } : initialFilters;
      const result = await loadMoreExpenses(serverMonthParam, offset, filters);
      return { items: result.expenses, hasMore: result.hasMore };
    },
    searchQuery,
    onSearchError: () => toast.error('검색에 실패했습니다'),
    onLoadMoreError: () => toast.error('더 불러오기에 실패했습니다'),
  });

  // ?new=1 — 빠른 등록(대시보드)에서 진입 시 지출 등록 폼을 즉시 오픈
  useQuickCreate(form.handleOpenForm);

  // 낙관적 삭제: 즉시 목록에서 제거하고, 서버 실패 시 자동 롤백된다.
  const [optimisticExpenses, removeOptimisticExpense] = useOptimistic(
    allExpenses,
    (list, deletedId: string) => list.filter((e) => e.id !== deletedId),
  );

  const summary = initialSummary;

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
        <ExpensesSummary summary={summary} />
      </ExpensesFiltersUI>

      <ExpensesList
        expenses={filteredExpenses}
        hasActiveFilters={hasActiveFilters}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore || isSearching}
        onLoadMore={handleLoadMore}
        onSelectExpense={handleSelectExpense}
        onResetFilters={handleResetFilters}
        onOpenForm={form.handleOpenForm}
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
      <ExpenseFormDialog form={form} categories={categories} payments={payments} />

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
                <Button variant="outline" className="flex-1" onClick={() => form.handleEdit(selectedExpense)}>
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

      {/* Edit Dialog (+ 고정비 이것만/이후 모두 분기) */}
      <ExpenseEditDialog form={form} categories={categories} payments={payments} />

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

      {/* Expense Settings Modal */}
      <ExpenseSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        categories={categories}
        payments={payments}
        onRefresh={refreshSettings}
      />

      {/* FAB — Speed Dial */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { setFabOpen(false); form.handleOpenForm(); }}
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
              설정
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
