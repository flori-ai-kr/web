'use client';

import {useMemo} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Search, Wallet} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';

interface ExpensesListProps {
  expenses: Expense[];
  categoryLabels: Record<string, string>;
  categoryColors: Record<string, string>;
  paymentLabels: Record<string, string>;
  paymentColors: Record<string, string>;
  hasActiveFilters: boolean;
  onSelectExpense: (expense: Expense) => void;
  onResetFilters: () => void;
  onOpenForm: () => void;
}

interface DateGroup {
  date: string;
  label: string;
  expenses: Expense[];
  total: number;
}

export function ExpensesList({
  expenses,
  categoryLabels,
  categoryColors,
  paymentLabels,
  paymentColors,
  hasActiveFilters,
  onSelectExpense,
  onResetFilters,
  onOpenForm,
}: ExpensesListProps) {
  // 일자별 그룹핑
  const dateGroups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const key = expense.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(expense);
    }

    return Array.from(map.entries()).map(([date, dateExpenses]) => ({
      date,
      label: format(new Date(date), 'M월 d일 (EEE)', { locale: ko }),
      expenses: dateExpenses,
      total: dateExpenses.reduce((sum, e) => sum + e.total_amount, 0),
    }));
  }, [expenses]);

  // 빈 상태
  if (expenses.length === 0) {
    return (
      <Card className="p-8 text-center">
        {hasActiveFilters ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm">선택한 필터에 맞는 지출이 없습니다</p>
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              필터 초기화
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-muted-foreground" />
            </div>
            <p>등록된 지출이 없습니다</p>
            <Button variant="outline" size="sm" onClick={onOpenForm}>
              첫 지출 등록하기
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dateGroups.map((group) => (
        <div key={group.date}>
          {/* 날짜 헤더 */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
              {group.label}
            </h3>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {group.expenses.length}건 · {formatCurrency(group.total)}
            </span>
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.expenses.map((expense) => (
              <Card
                key={expense.id}
                className="cursor-pointer hover:bg-muted/30 active:bg-muted active:scale-[0.99] transition-colors touch-manipulation"
                onClick={() => onSelectExpense(expense)}
                aria-label={`${expense.item_name} ${formatCurrency(expense.total_amount)} 상세 보기`}
              >
                <CardContent className="px-4 py-3">
                  {/* 1줄: 카테고리 + 결제 + 물품명 + 금액 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded shrink-0"
                        style={{
                          backgroundColor: categoryColors[expense.category] ? `${categoryColors[expense.category]}40` : '#f3f4f6',
                          color: categoryColors[expense.category] || '#374151'
                        }}
                      >
                        {categoryLabels[expense.category] || expense.category}
                      </span>
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0"
                        style={{
                          backgroundColor: paymentColors[expense.payment_method] ? `${paymentColors[expense.payment_method]}40` : '#f3f4f6',
                          color: paymentColors[expense.payment_method] || '#374151'
                        }}
                      >
                        {paymentLabels[expense.payment_method] || expense.payment_method}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{expense.item_name}</span>
                    </div>
                    <span className="font-semibold text-sm text-foreground whitespace-nowrap tabular-nums">
                      {formatCurrency(expense.total_amount)}
                    </span>
                  </div>

                  {/* 2줄: 거래처 + 수량 + 메모 */}
                  {(expense.vendor || expense.quantity > 1 || expense.note) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                      {expense.vendor && (
                        <span className="shrink-0">{expense.vendor}</span>
                      )}
                      {expense.vendor && (expense.quantity > 1 || expense.note) && (
                        <span className="shrink-0">·</span>
                      )}
                      {expense.quantity > 1 && (
                        <span className="shrink-0">{formatCurrency(expense.unit_price)} x {expense.quantity}</span>
                      )}
                      {expense.quantity > 1 && expense.note && (
                        <span className="shrink-0">·</span>
                      )}
                      {expense.note && (
                        <span className="truncate">{expense.note}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
