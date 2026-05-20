import {getExpenseById, getExpenses} from '@/lib/actions/expenses';
import {getExpenseCategories, getExpensePaymentMethods} from '@/lib/actions/expense-settings';
import {ExpensesClient} from './expenses-client';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    day?: string;
    expenseId?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // "all"이면 전체 조회, 아니면 특정 년/월/일
  const isAllYear = params.year === 'all';
  const isAllMonth = params.month === 'all';
  const isAllDay = !params.day || params.day === 'all';
  const currentYear = isAllYear ? 0 : (params.year ? parseInt(params.year, 10) : now.getFullYear());
  const currentMonth = isAllMonth ? 0 : (params.month ? parseInt(params.month, 10) : now.getMonth() + 1);

  const parsedDay = isAllDay ? 0 : parseInt(params.day!, 10);
  const currentDay = (isAllYear || isAllMonth || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31)
    ? 0
    : parsedDay;

  // getExpenses 파라미터: "YYYY-MM-DD" (특정일), "YYYY-MM" (특정월), "YYYY" (1년), undefined (전체)
  let monthParam: string | undefined;
  if (isAllYear) {
    monthParam = undefined;
  } else if (isAllMonth) {
    monthParam = currentYear.toString();
  } else if (currentDay === 0) {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  } else {
    monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  }

  const [expenses, categories, payments] = await Promise.all([
    getExpenses(monthParam),
    getExpenseCategories(),
    getExpensePaymentMethods(),
  ]);

  const initialSelectedExpense = params.expenseId ? await getExpenseById(params.expenseId) : null;

  return (
    <ExpensesClient
      initialExpenses={expenses}
      currentYear={currentYear}
      currentMonth={currentMonth}
      currentDay={currentDay}
      initialCategories={categories}
      initialPayments={payments}
      initialSelectedExpense={initialSelectedExpense}
    />
  );
}
