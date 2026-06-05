'use client';

import {useEffect, useMemo, useRef} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {FileText, ImagePlus, Loader2, Search, TrendingUp, User} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import {CHANNEL_LABELS} from '@/lib/constants';
import type {Sale} from '@/types/database';

interface SalesListProps {
  sales: Sale[];
  categoryLabels: Record<string, string>;
  paymentLabels: Record<string, string>;
  hasActiveFilters: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onSelectSale: (sale: Sale) => void;
  onOpenPhoto: (sale: Sale) => void;
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
  paymentLabels,
  hasActiveFilters,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSelectSale,
  onOpenPhoto,
  onResetFilters,
  onOpenForm,
}: SalesListProps) {
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
    const map = new Map<string, Sale[]>();
    for (const sale of sales) {
      const key = sale.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sale);
    }

    return Array.from(map.entries()).map(([date, dateSales]) => ({
      date,
      label: format(new Date(date), 'yyyy년 M월 d일 (EEE)', { locale: ko }),
      sales: dateSales,
      total: dateSales.reduce((sum, s) => s.payment_method === 'unpaid' ? sum : sum + s.amount, 0),
    }));
  }, [sales]);

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
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-[13px] font-semibold text-foreground whitespace-nowrap">
              {group.label}
            </h2>
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {group.sales.length}건 · {formatCurrency(group.total)}
            </span>
          </div>

          {/* 미니멀 로우 리스트 */}
          <div className="divide-y divide-border/50">
            {group.sales.map((sale) => {
              const isUnpaid = sale.payment_method === 'unpaid';

              const hasPhotos = !!(sale.photos && sale.photos.length > 0);

              return (
                <div
                  key={sale.id}
                  className="w-full flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors touch-manipulation"
                >
                  {/* 사진 셀: 있으면 썸네일, 없으면 등록 유도 버튼 */}
                  {hasPhotos ? (
                    <button
                      type="button"
                      onClick={() => onOpenPhoto(sale)}
                      className="relative shrink-0 active:scale-95 transition-transform"
                      aria-label="사진 수정"
                    >
                      <div className="relative w-[50px] h-[50px] rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={sale.photos![0]}
                          alt=""
                          fill
                          sizes="50px"
                          className="object-cover"
                        />
                      </div>
                      {sale.photos!.length > 1 && (
                        <span className="absolute -bottom-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-background flex items-center justify-center text-[9px] font-bold text-brand shadow-sm ring-1 ring-border">
                          {sale.photos!.length}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenPhoto(sale)}
                      className="shrink-0 w-[50px] h-[50px] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-brand/50 hover:text-brand active:scale-95 transition-all"
                      aria-label="사진 등록"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                  )}

                  {/* 내용 + 금액: 상세 열기 */}
                  <button
                    type="button"
                    onClick={() => onSelectSale(sale)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left active:opacity-70 transition-opacity"
                    aria-label={`${categoryLabels[sale.product_category] || sale.product_category} ${formatCurrency(sale.amount)} 상세 보기`}
                  >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {categoryLabels[sale.product_category] || sale.product_category || sale.product_name}
                      </span>
                      {isUnpaid ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium dark:bg-amber-950 dark:text-amber-400">
                          미수
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {paymentLabels[sale.payment_method] || sale.payment_method}
                        </span>
                      )}
                      {sale.reservation_channel && sale.reservation_channel !== 'other' && (
                        <>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[11px] text-muted-foreground">
                            {CHANNEL_LABELS[sale.reservation_channel]}
                          </span>
                        </>
                      )}
                    </div>
                    {(sale.customer_name || sale.memo) && (
                      <div className="flex items-center gap-2.5 mt-1">
                        {sale.customer_name && (
                          <span className="flex items-center gap-1 text-[11px] text-foreground/75 shrink-0">
                            <User className="w-3 h-3 shrink-0 text-brand" aria-hidden />
                            {sale.customer_name}
                          </span>
                        )}
                        {sale.memo && (
                          <span className="flex items-center gap-1 text-[11px] text-foreground/75 min-w-0">
                            <FileText className="w-3 h-3 shrink-0 text-brand" aria-hidden />
                            <span className="truncate">{sale.memo}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${isUnpaid ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {formatCurrency(sale.amount)}
                    </span>
                  </div>
                  </button>
                </div>
              );
            })}
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
