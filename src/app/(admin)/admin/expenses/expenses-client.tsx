'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Plus, Repeat, Settings} from 'lucide-react';
import {ExpensesList} from './components/ExpensesList';
import {ExpensesFiltersUI} from './components/ExpensesFilters';
import {ExpensesSummary} from './components/ExpensesSummary';
import {ExpenseFormDialog} from './components/expense-form-dialog';
import {ExpenseEditDialog} from './components/expense-edit-dialog';
import {ExpenseDetailDialog} from './components/expense-detail-dialog';
import {ExpenseDeleteDialog} from './components/expense-delete-dialog';
import {useExpenseForm} from './hooks/use-expense-form';
import {useExpenseDelete} from './hooks/use-expense-delete';
import {RecurringExpensesSection} from '@/components/expenses/recurring-expenses-section';
import {toast} from 'sonner';
import {loadMoreExpenses} from '@/lib/actions/expenses';
import type {ExpenseFilters} from '@/lib/actions/expenses';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  getExpenseCategories,
  getExpensePaymentMethods,
} from '@/lib/actions/expense-settings';
import {ExpenseSettingsModal} from '@/components/expenses/ExpenseSettingsModal';
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

  // 삭제 확인 + 낙관적 목록 제거 (고정비 '이것만/이후 모두' 포함)
  const del = useExpenseDelete({ allExpenses, setAllExpenses, onCloseDetail: () => setSelectedExpense(null) });

  const summary = initialSummary;

  const filteredExpenses = del.optimisticExpenses;
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
      <ExpenseDetailDialog
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onEdit={form.handleEdit}
        onDelete={del.handleDelete}
      />

      {/* Edit Dialog (+ 고정비 이것만/이후 모두 분기) */}
      <ExpenseEditDialog form={form} categories={categories} payments={payments} />

      {/* Delete Confirm Dialog */}
      <ExpenseDeleteDialog
        target={del.deleteTarget}
        onClose={() => del.setDeleteTarget(null)}
        onConfirm={del.confirmDelete}
      />

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
