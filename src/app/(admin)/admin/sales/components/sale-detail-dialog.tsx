'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {ImageLightbox} from '@/components/ui/image-lightbox';
import {CalendarDays, Check, ExternalLink, ImageIcon, PackageCheck, Pencil, Trash2} from 'lucide-react';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {formatCurrency, isUnsettledUnpaid} from '@/lib/utils';
import type {PhotoCard, Reservation, Sale} from '@/types/database';

interface SaleDetailDialogProps {
  sale: Sale | null;
  photos: PhotoCard | null;
  reservations: Reservation[];
  onClose: () => void;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  onPhotoModal: (sale: Sale) => void;
}

export function SaleDetailDialog({
  sale,
  photos,
  reservations,
  onClose,
  onEdit,
  onDelete,
  onPhotoModal,
}: SaleDetailDialogProps) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const photoUrls = photos?.photos.map((p) => p.url) ?? [];

  return (
    <>
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">매출 상세</DialogTitle>
        </DialogHeader>
        {sale && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">날짜</p>
                <p className="font-medium">{format(new Date(sale.date), 'yyyy년 M월 d일', { locale: ko })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">금액</p>
                <p className="font-bold text-lg text-brand">{formatCurrency(sale.amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">카테고리</p>
                <p className="font-medium">{sale.category_label ?? '미분류'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">결제방식</p>
                <p className="font-medium">
                  {isUnsettledUnpaid(sale) ? '미수' : (sale.payment_method_label ?? '-')}
                  {sale.is_unpaid && sale.payment_method_id ? <span className="text-xs text-muted-foreground font-normal"> · 외상 결제완료</span> : null}
                </p>
              </div>
              {sale.channel_label && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">예약방식</p>
                <p className="font-medium">{sale.channel_label}</p>
              </div>
              )}
              {sale.customer_name && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">고객명</p>
                  {sale.customer_id ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 font-medium text-brand hover:text-brand/80 transition-colors"
                      onClick={() => {
                        onClose();
                        router.push(`/admin/customers?customerId=${sale.customer_id}`);
                      }}
                      aria-label={`${sale.customer_name} 고객 상세 보기`}
                    >
                      <span>{sale.customer_name}</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <p className="font-medium">{sale.customer_name}</p>
                  )}
                </div>
              )}
            </div>

            {sale.customer_phone && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">연락처</p>
                <p className="font-medium">{sale.customer_phone}</p>
              </div>
            )}

            {sale.memo && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-sm text-muted-foreground">메모</p>
                <p className="text-foreground">{sale.memo}</p>
              </div>
            )}

            {photos && photos.photos.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">사진</p>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/gallery?card=${photos.id}`)}
                    className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand/80 transition-colors"
                    aria-label="사진첩에서 이 포토카드 열기"
                  >
                    사진첩에서 보기
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.photos.slice(0, 6).map((photo, index) => (
                    <button
                      key={photo.url}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className="relative aspect-square rounded-lg overflow-hidden group"
                      aria-label={`사진 ${index + 1} 크게 보기`}
                    >
                      <ImageWithSkeleton
                        src={photo.url}
                        alt={`사진 ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 33vw, 128px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      {index === 5 && photos.photos.length > 6 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-medium">+{photos.photos.length - 6}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 연결된 예약(픽업) */}
            {reservations.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  연결된 픽업 ({reservations.length}건)
                </p>
                <div className="space-y-1.5">
                  {reservations.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left cursor-pointer"
                      onClick={() => {
                        onClose();
                        router.push(`/admin/calendar?date=${r.date}`);
                      }}
                      aria-label={`${r.title} 예약으로 이동`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.date), 'M월 d일', { locale: ko })}
                          {r.time && ` ${r.time.slice(0, 5)}`}
                          {r.amount > 0 && ` · ${formatCurrency(r.amount)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.status === 'confirmed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand text-brand-foreground inline-flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            제작
                          </span>
                        )}
                        {r.pickup_completed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success text-success-foreground inline-flex items-center gap-0.5">
                            <PackageCheck className="w-2.5 h-2.5" />
                            픽업
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onPhotoModal(sale);
                  onClose();
                }}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                사진
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => onEdit(sale)}>
                <Pencil className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => onDelete(sale)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <ImageLightbox
      images={photoUrls}
      index={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
      onNavigate={setLightboxIndex}
      caption={sale?.category_label ?? ''}
    />
    </>
  );
}
