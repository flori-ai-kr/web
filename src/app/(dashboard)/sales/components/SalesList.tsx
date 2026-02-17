'use client';

import { useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ImageIcon, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { CHANNEL_LABELS } from '@/lib/constants';
import type { Sale } from '@/types/database';

interface SalesListProps {
  sales: Sale[];
  categoryLabels: Record<string, string>;
  categoryColors: Record<string, string>;
  paymentLabels: Record<string, string>;
  paymentColors: Record<string, string>;
  hasActiveFilters: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onSelectSale: (sale: Sale) => void;
  onResetFilters: () => void;
  onOpenForm: () => void;
}

interface DateGroup {
  date: string;
  label: string;
  sales: Sale[];
  total: number;
}

export function SalesList({
  sales,
  categoryLabels,
  categoryColors,
  paymentLabels,
  paymentColors,
  hasActiveFilters,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSelectSale,
  onResetFilters,
  onOpenForm,
}: SalesListProps) {
  // 무한스크롤 IntersectionObserver
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
  // 일자별 그룹핑
  const dateGroups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const sale of sales) {
      const key = sale.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sale);
    }

    return Array.from(map.entries()).map(([date, dateSales]) => ({
      date,
      label: format(new Date(date), 'M월 d일 (EEE)', { locale: ko }),
      sales: dateSales,
      total: dateSales.reduce((sum, s) => sum + s.amount, 0),
    }));
  }, [sales]);

  // 빈 상태
  if (sales.length === 0) {
    return (
      <Card className="p-8 text-center">
        {hasActiveFilters ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm">선택한 필터에 맞는 매출이 없습니다</p>
            <Button variant="outline" size="sm" onClick={onResetFilters}>
              필터 초기화
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
            <p>등록된 매출이 없습니다</p>
            <Button variant="outline" size="sm" onClick={onOpenForm}>
              첫 매출 등록하기
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
              {group.sales.length}건 · {formatCurrency(group.total)}
            </span>
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {group.sales.map((sale) => (
              <Card
                key={sale.id}
                className="cursor-pointer hover:bg-muted/30 active:bg-muted active:scale-[0.99] transition-colors touch-manipulation"
                onClick={() => onSelectSale(sale)}
                aria-label={`${categoryLabels[sale.product_category] || sale.product_category} ${formatCurrency(sale.amount)} 상세 보기`}
              >
                <CardContent className="px-4 py-3">
                  {/* 1줄: 카테고리 + 결제 + 고객명 + 금액 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded shrink-0"
                        style={{
                          backgroundColor: categoryColors[sale.product_category] ? `${categoryColors[sale.product_category]}40` : '#f3f4f6',
                          color: categoryColors[sale.product_category] || '#374151'
                        }}
                      >
                        {categoryLabels[sale.product_category] || sale.product_category || sale.product_name}
                      </span>
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0"
                        style={{
                          backgroundColor: paymentColors[sale.payment_method] ? `${paymentColors[sale.payment_method]}40` : '#f3f4f6',
                          color: paymentColors[sale.payment_method] || '#374151'
                        }}
                      >
                        {paymentLabels[sale.payment_method] || sale.payment_method}
                      </span>
                      {(sale.reservation_channel === 'road' || sale.customer_name) && (
                        <span className="text-xs text-muted-foreground truncate">
                          {sale.reservation_channel === 'road' ? '로드' : sale.customer_name}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-sm text-foreground whitespace-nowrap tabular-nums">
                      {formatCurrency(sale.amount)}
                    </span>
                  </div>

                  {/* 2줄: 채널 + 메모 + 사진 아이콘 */}
                  {(sale.reservation_channel || sale.note || (sale.photos && sale.photos.length > 0)) && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 text-xs text-muted-foreground">
                        {sale.reservation_channel && sale.reservation_channel !== 'other' && (
                          <span className="shrink-0">{CHANNEL_LABELS[sale.reservation_channel]}</span>
                        )}
                        {sale.reservation_channel && sale.reservation_channel !== 'other' && sale.note && (
                          <span className="shrink-0">·</span>
                        )}
                        {sale.note && (
                          <span className="truncate">{sale.note}</span>
                        )}
                      </div>
                      {sale.photos && sale.photos.length > 0 && (
                        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
