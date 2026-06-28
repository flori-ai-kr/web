'use client';

import {useEffect, useMemo, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {CreditCard, FileText, Loader2, Search, Store, Wallet} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import type {Expense} from '@/types/database';

interface ExpensesListProps {
  expenses: Expense[];
  hasActiveFilters: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
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
  hasActiveFilters,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSelectExpense,
  onResetFilters,
  onOpenForm,
}: ExpensesListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const dateGroups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const key = expense.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(expense);
    }

    return Array.from(map.entries()).map(([date, dateExpenses]) => ({
      date,
      label: format(new Date(date), 'yyyy년 M월 d일 (EEE)', { locale: ko }),
      expenses: dateExpenses,
      total: dateExpenses.reduce((sum, e) => sum + e.total_amount, 0),
    }));
  }, [expenses]);

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
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-[13px] font-semibold text-foreground whitespace-nowrap">
              {group.label}
            </h2>
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {group.expenses.length}건 · {formatCurrency(group.total)}
            </span>
          </div>

          {/* 카드 그리드 (데스크탑 2열) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {group.expenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => onSelectExpense(expense)}
                className="flex flex-col text-left p-3 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow active:opacity-70"
                aria-label={`${expense.item_name} ${formatCurrency(expense.total_amount)} 상세 보기`}
              >
                {/* 상단: 카테고리·물품명 + 금액 */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="truncate">{expense.category_label ?? '미분류'}</span>
                    {expense.item_name && (
                      <span className="text-[12.5px] font-medium text-muted-foreground truncate">{expense.item_name}</span>
                    )}
                    {expense.recurring_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-muted text-brand font-medium">
                        고정비
                      </span>
                    )}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums whitespace-nowrap text-foreground">
                    {formatCurrency(expense.total_amount)}
                  </span>
                </div>

                {/* 메타: 결제수단·거래처 / 단가×수량 (루시드 아이콘) */}
                <div className="flex flex-col gap-1 mt-2">
                  {(expense.payment_method_label || expense.vendor) && (
                    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-muted-foreground">
                      {expense.payment_method_label && (
                        <span className="flex items-center gap-1 min-w-0">
                          <CreditCard className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                          <span className="text-foreground/80 truncate">{expense.payment_method_label}</span>
                        </span>
                      )}
                      {expense.vendor && (
                        <span className="flex items-center gap-1 min-w-0">
                          <Store className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                          <span className="text-foreground/80 truncate">{expense.vendor}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {expense.quantity > 1 && (
                    <div className="text-[11.5px] text-muted-foreground tabular-nums">
                      {formatCurrency(expense.unit_price)} × {expense.quantity}
                    </div>
                  )}
                </div>

                {/* 메모: 2줄까지 */}
                {expense.memo && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border text-[11.5px] text-muted-foreground w-full">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-brand/85 mt-0.5" aria-hidden />
                    <span className="text-foreground/80 leading-snug line-clamp-2">{expense.memo}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* 무한스크롤 sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
