import {getExpenseById, getExpenses, getExpensesSummary} from '@/lib/actions/expenses';
import type {ExpenseFilters} from '@/lib/actions/expenses';
import {getExpenseCategories, getExpensePaymentMethods} from '@/lib/actions/expense-settings';
import {ExpensesClient} from './expenses-client';

function isValidDate(s?: string): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    day?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    payment?: string;
    expenseId?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();

  const isAllYear = params.year === 'all';
  const isAllMonth = params.month === 'all';
  const isAllDay = !params.day || params.day === 'all';
  const currentYear = isAllYear ? 0 : (params.year ? parseInt(params.year, 10) : now.getFullYear());
  const currentMonth = isAllMonth ? 0 : (params.month ? parseInt(params.month, 10) : now.getMonth() + 1);

  const parsedDay = isAllDay ? 0 : parseInt(params.day!, 10);
  const currentDay = (isAllYear || isAllMonth || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)
    ? 0
    : parsedDay;

  const rangeStart = isValidDate(params.startDate) ? params.startDate! : null;
  const rangeEnd = isValidDate(params.endDate) ? params.endDate! : null;
  const hasDateRange = !!(rangeStart && rangeEnd && rangeEnd >= rangeStart);
  const dateRange = hasDateRange ? { startDate: rangeStart!, endDate: rangeEnd! } : undefined;

  let monthParam: string | undefined;
  if (hasDateRange) {
    monthParam = undefined;
  } else if (isAllYear) {
    monthParam = undefined;
  } else if (isAllMonth) {
    monthParam = currentYear.toString();
  } else if (currentDay === 0) {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  } else {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  }

  const parseMulti = (raw?: string) =>
    raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const categoryParam = parseMulti(params.category);
  const paymentParam = parseMulti(params.payment);
  const filters: ExpenseFilters = {
    category: categoryParam.length > 0 ? categoryParam : undefined,
    payment: paymentParam.length > 0 ? paymentParam : undefined,
  };

  // 이전 동일 길이 기간 비교 (로컬 KST 기준 — toISOString UTC 금지)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let prevDateRange: { startDate: string; endDate: string } | undefined;

  if (hasDateRange) {
    const start = new Date(params.startDate!);
    const end = new Date(params.endDate!);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
    prevDateRange = { startDate: fmt(prevStart), endDate: fmt(prevEnd) };
  } else if (!isAllYear && !isAllMonth && currentDay > 0) {
    const target = new Date(currentYear, currentMonth - 1, currentDay);
    const prev = new Date(target); prev.setDate(prev.getDate() - 1);
    prevDateRange = { startDate: fmt(prev), endDate: fmt(prev) };
  } else if (!isAllYear && !isAllMonth) {
    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevEnd = new Date(currentYear, currentMonth - 1, 0);
    prevDateRange = { startDate: fmt(prevDate), endDate: fmt(prevEnd) };
  }

  const [expensesResult, summary, prevSummary, categories, payments, initialSelectedExpense] = await Promise.all([
    getExpenses(monthParam, 0, 100, filters, dateRange),
    getExpensesSummary(monthParam, filters, dateRange),
    prevDateRange ? getExpensesSummary(undefined, undefined, prevDateRange) : Promise.resolve(null),
    getExpenseCategories(),
    getExpensePaymentMethods(),
    params.expenseId ? getExpenseById(params.expenseId) : Promise.resolve(null),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expensesResult.expenses}
      initialHasMore={expensesResult.hasMore}
      initialSummary={summary}
      prevTotal={prevSummary?.total ?? null}
      prevPeriod={prevDateRange ?? null}
      monthParam={monthParam ?? null}
      currentYear={currentYear}
      currentMonth={currentMonth}
      currentDay={currentDay}
      initialCategories={categories}
      initialPayments={payments}
      initialFilters={filters}
      initialSelectedExpense={initialSelectedExpense}
    />
  );
}
