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

  // 쉼표 분리 + 양수 정수 id만 통과(URL 조작 방어; 테넌트 격리는 BFF가 최종 수행)
  const parseMulti = (raw?: string) =>
    raw ? raw.split(',').map(s => s.trim()).filter(v => /^[1-9]\d*$/.test(v)) : [];
  const categoryParam = parseMulti(params.category);
  const paymentParam = parseMulti(params.payment);
  const filters: ExpenseFilters = {
    category: categoryParam.length > 0 ? categoryParam : undefined,
    payment: paymentParam.length > 0 ? paymentParam : undefined,
  };

  const [expensesResult, summary, categories, payments, initialSelectedExpense] = await Promise.all([
    getExpenses(monthParam, 0, 100, filters, dateRange),
    getExpensesSummary(monthParam, filters, dateRange),
    getExpenseCategories(),
    getExpensePaymentMethods(),
    params.expenseId ? getExpenseById(params.expenseId) : Promise.resolve(null),
  ]);

  return (
    <ExpensesClient
      initialExpenses={expensesResult.expenses}
      initialHasMore={expensesResult.hasMore}
      initialSummary={summary}
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
