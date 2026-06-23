'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {CreditCard, FileText, ImagePlus, Loader2, Phone, Search, ShoppingBag, TrendingUp, User} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency, isUnsettledUnpaid} from '@/lib/utils';
import {ImageLightbox} from '@/components/ui/image-lightbox';
import type {Sale} from '@/types/database';

interface SalesListProps {
  sales: Sale[];
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
  // 매출 썸네일 클릭 → 사진 라이트박스(확대). null이면 닫힘.
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

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
      total: dateSales.reduce((sum, s) => isUnsettledUnpaid(s) ? sum : sum + s.amount, 0),
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

          {/* 카드 그리드 (데스크탑 2열) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {group.sales.map((sale) => {
              const isUnpaid = isUnsettledUnpaid(sale);
              const hasPhotos = !!(sale.photos && sale.photos.length > 0);

              return (
                <div
                  key={sale.id}
                  className="flex gap-3 p-3 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* 썸네일: 있으면 사진, 없으면 등록 유도 */}
                  {hasPhotos ? (
                    <button
                      type="button"
                      onClick={() => setLightbox({ photos: sale.photos!, index: 0 })}
                      className="relative shrink-0 self-start active:scale-95 transition-transform cursor-zoom-in"
                      aria-label="사진 확대 보기"
                    >
                      <div className="relative w-[84px] h-[84px] rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={sale.photos![0]}
                          alt=""
                          fill
                          sizes="84px"
                          className="object-cover"
                        />
                      </div>
                      {sale.photos!.length > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 h-4 rounded-full bg-black/60 flex items-center justify-center text-[9px] font-bold text-white">
                          {sale.photos!.length}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenPhoto(sale)}
                      className="shrink-0 self-start w-[84px] h-[84px] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-brand/50 hover:text-brand active:scale-95 transition-colors"
                      aria-label="사진 등록"
                    >
                      <ImagePlus className="w-6 h-6" />
                    </button>
                  )}

                  {/* 내용: 상세 열기 */}
                  <button
                    type="button"
                    onClick={() => onSelectSale(sale)}
                    className="flex-1 min-w-0 flex flex-col text-left active:opacity-70 transition-opacity"
                    aria-label={`${sale.category_label ?? '미분류'} ${formatCurrency(sale.amount)} 상세 보기`}
                  >
                    {/* 상단: 카테고리 + 금액 */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="truncate">{sale.category_label ?? '미분류'}</span>
                        {isUnpaid && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning-soft text-warning font-medium">
                            미수
                          </span>
                        )}
                      </span>
                      <span className={`text-[15px] font-bold tabular-nums whitespace-nowrap ${isUnpaid ? 'text-warning' : 'text-foreground'}`}>
                        {formatCurrency(sale.amount)}
                      </span>
                    </div>

                    {/* 메타: 결제·채널 / 고객·연락처 (루시드 아이콘) */}
                    <div className="flex flex-col gap-1 mt-2">
                      {(!isUnpaid && sale.payment_method_label) || sale.channel_label ? (
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-muted-foreground">
                          {!isUnpaid && sale.payment_method_label && (
                            <span className="flex items-center gap-1 min-w-0">
                              <CreditCard className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                              <span className="text-foreground/80 truncate">{sale.payment_method_label}</span>
                            </span>
                          )}
                          {sale.channel_label && (
                            <span className="flex items-center gap-1 min-w-0">
                              <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                              <span className="text-foreground/80 truncate">{sale.channel_label}</span>
                            </span>
                          )}
                        </div>
                      ) : null}
                      {(sale.customer_name || sale.customer_phone) && (
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11.5px] text-muted-foreground">
                          {sale.customer_name && (
                            <span className="flex items-center gap-1 min-w-0">
                              <User className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                              <span className="text-foreground/80 truncate">{sale.customer_name}</span>
                            </span>
                          )}
                          {sale.customer_phone && (
                            <span className="flex items-center gap-1 min-w-0">
                              <Phone className="w-3.5 h-3.5 shrink-0 text-brand/85" aria-hidden />
                              <span className="text-foreground/80 truncate">{sale.customer_phone}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 메모: 2줄까지 */}
                    {sale.memo && (
                      <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border text-[11.5px] text-muted-foreground">
                        <FileText className="w-3.5 h-3.5 shrink-0 text-brand/85 mt-0.5" aria-hidden />
                        <span className="text-foreground/80 leading-snug line-clamp-2">{sale.memo}</span>
                      </div>
                    )}
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

      {/* 썸네일 클릭 시 사진 확대 라이트박스 */}
      <ImageLightbox
        images={lightbox?.photos ?? []}
        index={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        onNavigate={(next) => setLightbox((prev) => (prev ? { ...prev, index: next } : prev))}
        caption="매출 사진"
      />
    </div>
  );
}
