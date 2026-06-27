'use client';

import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Skeleton} from '@/components/ui/skeleton';
import {
    ExternalLink,
    FileText,
    Loader2,
    Lock,
    Pencil,
    Phone,
    ShoppingBag,
    Trash2,
    TrendingUp
} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency} from '@/lib/utils';
import {revertCustomerGradeAuto} from '@/lib/actions/customers';
import type {Customer, Sale} from '@/types/database';
import {GenderBadge} from './customer-card';
import {ImageLightbox} from '@/components/ui/image-lightbox';

interface CustomerDetailDialogProps {
  customer: Customer | null;
  sales: Sale[];
  isLoadingSales: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onSaleRegister: (customer: Customer) => void;
}

export function CustomerDetailDialog({
  customer,
  sales,
  isLoadingSales,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onClose,
  onEdit,
  onDelete,
  onSaleRegister,
}: CustomerDetailDialogProps) {
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isReverting, setIsReverting] = useState(false);
  // 연결사진 썸네일 클릭 → 라이트박스로 확대(사진첩 이동 X). null이면 닫힘.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleRevertGrade = useCallback(async () => {
    if (!customer || isReverting) return;
    setIsReverting(true);
    try {
      await revertCustomerGradeAuto(customer.id);
      router.refresh();
    } finally {
      setIsReverting(false);
    }
  }, [customer, isReverting, router]);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">고객 상세</DialogTitle>
        </DialogHeader>
        {customer && (
          <div className="space-y-4 pt-2">
            <div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-lg text-foreground">{customer.name}</span>
                  {customer.grade && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-brand-muted text-brand">
                      {customer.grade}
                      {customer.grade_locked && <Lock className="h-3 w-3" aria-label="수동 고정됨" />}
                    </span>
                  )}
                  <GenderBadge gender={customer.gender} size="md" />
                </div>
                <a href={`tel:${customer.phone.replace(/-/g, '')}`} className="flex items-center gap-1 text-muted-foreground text-sm hover:text-brand transition-colors">
                  <Phone className="w-3 h-3" />
                  <span>{customer.phone}</span>
                </a>
                {customer.grade_locked && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      수동 고정됨
                    </span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={handleRevertGrade}
                      disabled={isReverting}
                      className="inline-flex items-center gap-1 text-brand hover:underline disabled:opacity-60"
                    >
                      {isReverting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                      자동 등급으로 되돌리기
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">구매 횟수</p>
                <p className="text-xl font-bold text-foreground tabular-nums">{customer.total_purchase_count}회</p>
              </div>
              <div className="text-center rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">총 구매액</p>
                <p className="text-xl font-bold text-brand tabular-nums">{formatCurrency(customer.total_purchase_amount)}</p>
              </div>
            </div>

            {customer.photo_count > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">연결된 사진 · {customer.photo_count}</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/admin/gallery?customer=${customer.id}`);
                    }}
                    className="text-xs text-brand hover:underline"
                  >
                    사진첩에서 보기 →
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {customer.photo_thumbnails.slice(0, 6).map((thumb, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const overflow = customer.photo_count - customer.photo_thumbnails.length;
                    return (
                      <button
                        key={`${thumb.card_id}-${i}`}
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="block overflow-hidden rounded-xl border border-border bg-card cursor-zoom-in hover:opacity-80 hover:border-brand/50 transition-opacity"
                        aria-label={`연결 사진 ${i + 1} 확대 보기`}
                      >
                        {/* iOS WebKit은 <button>에 aspect-ratio를 적용하지 않아 셀이 0높이로 붕괴(겹침). aspect 박스를 내부 span으로 분리. */}
                        <span className="relative block aspect-square">
                          <ImageWithSkeleton
                            src={thumb.url}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                          {isLast && overflow > 0 && (
                            <span className="absolute inset-0 grid place-items-center bg-foreground/60 text-sm font-semibold text-white">
                              +{overflow}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {customer.first_purchase_date && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">첫 구매</p>
                  <p className="font-medium">{format(new Date(customer.first_purchase_date), 'yyyy.M.d', { locale: ko })}</p>
                </div>
                {customer.last_purchase_date && (
                  <div>
                    <p className="text-muted-foreground">최근 구매</p>
                    <p className="font-medium">{format(new Date(customer.last_purchase_date), 'yyyy.M.d', { locale: ko })}</p>
                  </div>
                )}
              </div>
            )}

            {customer.memo && (
              <div className="space-y-1.5 pt-2 border-t">
                <p className="text-sm text-muted-foreground">메모</p>
                <div className="flex items-start gap-1.5 rounded-xl border border-border bg-card p-3">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-brand/85 mt-0.5" aria-hidden />
                  <p className="text-sm leading-snug text-foreground/90 whitespace-pre-wrap">{customer.memo}</p>
                </div>
              </div>
            )}

            {/* Purchase History */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">구매 이력</p>
              </div>
              {isLoadingSales ? (
                <div className="space-y-2 py-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center rounded-xl border border-border bg-card p-2.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-8" />
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : sales.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex justify-between items-center text-sm rounded-xl border border-border bg-card p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums">{format(new Date(sale.date), 'yy/MM/dd')}</span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">
                          {sale.category_label ?? '미분류'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground tabular-nums">{formatCurrency(sale.amount)}</span>
                        <button
                          type="button"
                          className="text-brand hover:text-brand p-1"
                          onClick={() => {
                            const saleDate = new Date(sale.date);
                            const year = saleDate.getFullYear();
                            const month = saleDate.getMonth() + 1;
                            router.push(`/admin/sales?year=${year}&month=${month}&saleId=${sale.id}`);
                          }}
                          title="매출 상세 보기"
                          aria-label="매출 상세 보기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="h-1" />
                  {isLoadingMore && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="로딩 중" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">아직 구매 이력이 없습니다</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => onSaleRegister(customer)}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  매출 등록
                </Button>
                <Button variant="outline" onClick={() => onEdit(customer)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  className="text-danger hover:text-danger hover:bg-danger-soft"
                  onClick={() => onDelete(customer)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* 연결사진 썸네일 클릭 → 바로 라이트박스 확대(사진첩 이동 X). */}
      <ImageLightbox
        images={(customer?.photo_thumbnails ?? []).map((t) => t.url)}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        caption={customer ? `${customer.name} 연결 사진` : ''}
      />
    </Dialog>
  );
}
