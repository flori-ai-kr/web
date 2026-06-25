'use client';

import {useCallback, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ExpensesList} from './components/expenses-list';
import {ExpensesFiltersUI} from './components/expenses-filters';
import {ExpensesSummary} from './components/expenses-summary';
import {ExpenseFormDialog} from './components/expense-form-dialog';
import {ExpenseEditDialog} from './components/expense-edit-dialog';
import {ExpenseDetailDialog} from './components/expense-detail-dialog';
import {ExpenseDeleteDialog} from './components/expense-delete-dialog';
import {ExpenseFab} from './components/expense-fab';
import {useExpenseForm} from './hooks/use-expense-form';
import {useExpenseDelete} from './hooks/use-expense-delete';
import {RecurringExpensesSection} from '@/app/(admin)/admin/expenses/components/recurring-expenses-section';
import {toast} from 'sonner';
import {loadMoreExpenses} from '@/lib/actions/expenses';
import type {ExpenseFilters} from '@/lib/actions/expenses';
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  getExpenseCategories,
  getExpensePaymentMethods,
} from '@/lib/actions/expense-settings';
import {ExpenseSettingsModal} from '@/app/(admin)/admin/expenses/components/expense-settings-modal';
import type {Expense} from '@/types/database';
import {type ExportConfig, exportPeriodLabels} from '@/lib/export';
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
  dateRange: { startDate: string; endDate: string } | null;
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
  dateRange: serverDateRange,
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
  const [categories, setCategories] = useState<ExpenseCategory[]>(initialCategories);
  const [payments, setPayments] = useState<ExpensePaymentMethod[]>(initialPayments);

  // 등록/수정 폼 상태 + 제출 (고정비 건도 일반 지출과 동일하게 단건 수정)
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
      const result = await loadMoreExpenses(serverMonthParam, offset, filters, serverDateRange ?? undefined);
      return { items: result.expenses, hasMore: result.hasMore };
    },
    searchQuery,
    onSearchError: () => toast.error('검색에 실패했습니다'),
    onLoadMoreError: () => toast.error('더 불러오기에 실패했습니다'),
  });

  // ?new=1 — 빠른 등록(대시보드)에서 진입 시 지출 등록 폼을 즉시 오픈
  useQuickCreate(form.handleOpenForm);

  // 삭제 확인 + 낙관적 목록 제거 (고정비 건도 단건 삭제 — skip 마커로 재생성 방지)
  const del = useExpenseDelete({ allExpenses, setAllExpenses, onCloseDetail: () => setSelectedExpense(null) });

  const summary = initialSummary;

  const filteredExpenses = del.optimisticExpenses;
  const hasActiveFilters = paymentFilter.length > 0 || categoryFilter.length > 0 || searchQuery !== '';

  const refreshSettings = async () => {
    const [cats, pays] = await Promise.all([getExpenseCategories(), getExpensePaymentMethods()]);
    setCategories(cats);
    setPayments(pays);
  };

  const getExportConfig = useCallback((): ExportConfig<Expense> => {
    const { fileSuffix, rangeLabel } = exportPeriodLabels(
      serverDateRange ? { range: serverDateRange } : { year: currentYear, month: currentMonth, day: currentDay },
    );
    return ({
      filename: `지출${fileSuffix}`,
      title: `지출 내역 (${rangeLabel})`,
      columns: [
        { header: '날짜', accessor: (e) => String(e.date || '') },
        { header: '카테고리', accessor: (e) => e.category_label || '' },
        { header: '품목명', accessor: (e) => String(e.item_name || '') },
        { header: '단가', accessor: (e) => Number(e.unit_price) || 0, format: 'currency' },
        { header: '수량', accessor: (e) => Number(e.quantity) || 0 },
        { header: '금액', accessor: (e) => Number(e.total_amount) || 0, format: 'currency' },
        { header: '결제방식', accessor: (e) => e.payment_method_label ?? '' },
        { header: '거래처', accessor: (e) => String(e.vendor || '') },
        { header: '메모', accessor: (e) => String(e.memo || '') },
      ],
      data: filteredExpenses,
    });
  }, [filteredExpenses, currentYear, currentMonth, currentDay, serverDateRange]);

  const handleSelectExpense = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  const yearParam = currentYear === 0 ? 'all' : currentYear.toString();
  const monthParam = currentMonth === 0 ? 'all' : currentMonth.toString();
  const dayParam = currentDay === 0 ? 'all' : currentDay.toString();

  // 커스텀 기간(serverDateRange)이 활성인데 기간 외 필터만 바꾸면(월/일 override 없음)
  // startDate/endDate를 보존한다 — 카테고리·결제 변경 시 기간이 풀리던 버그 방지.
  const buildUrl = useCallback((overrides: {
    year?: string; month?: string; day?: string; category?: string[]; payment?: string[];
  } = {}) => {
    const changingPeriod = overrides.year !== undefined || overrides.month !== undefined || overrides.day !== undefined;
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
    if (serverDateRange && !changingPeriod) {
      params.set('startDate', serverDateRange.startDate);
      params.set('endDate', serverDateRange.endDate);
    } else {
      params.set('year', p.year);
      params.set('month', p.month);
      if (p.day !== 'all') params.set('day', p.day);
    }
    if (p.category.length > 0) params.set('category', p.category.join(','));
    if (p.payment.length > 0) params.set('payment', p.payment.join(','));
    return `/admin/expenses?${params.toString()}`;
  }, [yearParam, monthParam, dayParam, categoryFilter, paymentFilter, serverDateRange]);

  const handleMonthNav = (direction: -1 | 1) => {
    let y = currentYear || new Date().getFullYear();
    let m = currentMonth || new Date().getMonth() + 1;
    m += direction;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    router.push(buildUrl({ year: y.toString(), month: m.toString(), day: 'all' }));
  };

  const handleMonthSelect = (year: number, month: number) => {
    router.push(buildUrl({ year: year.toString(), month: month.toString(), day: 'all' }));
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
    // 기간(커스텀 범위)도 함께 해제 → 이번 달. year/month override 로 buildUrl 이 범위를 떨구게 한다.
    const now = new Date();
    router.push(buildUrl({
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString(),
      day: 'all',
      category: [], payment: [],
    }));
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2 lg:-mx-6 xl:-mx-8">
      {/* 필터(월네비+기간) → 요약 → 드롭다운/검색 — 매출과 동일 */}
      <ExpensesFiltersUI
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentDay={currentDay}
        dateRange={serverDateRange}
        categoryFilter={categoryFilter}
        paymentFilter={paymentFilter}
        searchQuery={searchQuery}
        categories={categories}
        payments={payments}
        onMonthNav={handleMonthNav}
        onMonthSelect={handleMonthSelect}
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

      {/* Edit Dialog */}
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
      <ExpenseFab
        onOpenForm={form.handleOpenForm}
        onOpenRecurring={() => setIsRecurringOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        getExportConfig={getExportConfig}
      />
    </div>
  );
}
