'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {FileText, Lock, Pencil, Trash2} from 'lucide-react';
import {format} from 'date-fns';
import {formatCurrency} from '@/lib/utils';
import {ImageLightbox} from '@/components/ui/image-lightbox';
import type {Customer} from '@/types/database';

export const genderLabels: Record<string, string> = { male: '남', female: '여' };

export function GenderBadge({ gender, size = 'sm' }: { gender: string | null | undefined; size?: 'sm' | 'md' }) {
  if (!gender) return null;
  const base = size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]';
  if (gender === 'male') {
    return <span className={`${base} font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0`} aria-label="남성">{genderLabels.male}</span>;
  }
  if (gender === 'female') {
    return <span className={`${base} font-medium rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0`} aria-label="여성">{genderLabels.female}</span>;
  }
  return null;
}

interface CustomerCardProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerCard({ customer, onSelect, onEdit, onDelete }: CustomerCardProps) {
  const router = useRouter();
  const thumbnails = customer.photo_thumbnails?.slice(0, 6) ?? [];
  const photoCount = customer.photo_count ?? 0;
  const overflow = photoCount - thumbnails.length;
  // 썸네일 클릭 시 라이트박스로 확대(사진첩 이동 X). null이면 닫힘.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const goToGallery = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin/gallery?customer=${customer.id}`);
  };

  return (
    <>
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${customer.name} 상세 보기`}
      className="group cursor-pointer hover:bg-muted/30 active:bg-muted active:scale-[0.99] transition-colors touch-manipulation"
      onClick={() => onSelect(customer)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(customer); } }}
    >
      <CardContent className="p-4">
        {/* Top: name + grade + gender + actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground text-sm truncate">{customer.name}</span>
              {customer.grade && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground shrink-0">
                  {customer.grade}
                  {customer.grade_locked && <Lock className="h-2.5 w-2.5" aria-label="등급 고정됨" />}
                </span>
              )}
              <GenderBadge gender={customer.gender} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{customer.phone}</p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
              aria-label={`${customer.name} 수정`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-danger"
              onClick={(e) => { e.stopPropagation(); onDelete(customer); }}
              aria-label={`${customer.name} 삭제`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <div>
            <p className="text-[10px] text-muted-foreground">구매</p>
            <p className="text-sm font-semibold text-foreground tabular-nums">{customer.total_purchase_count}회</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">총액</p>
            <p className="text-sm font-semibold text-brand tabular-nums">{formatCurrency(customer.total_purchase_amount)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">최근</p>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {customer.last_purchase_date ? format(new Date(customer.last_purchase_date), 'yy/MM/dd') : '-'}
            </p>
          </div>
        </div>

        {/* Note preview */}
        {customer.memo && (
          <div className="flex items-start gap-1.5 mt-2" title={customer.memo}>
            <FileText className="w-3 h-3 shrink-0 text-brand/85 mt-0.5" aria-hidden />
            <span className="text-xs text-foreground/80 truncate">{customer.memo}</span>
          </div>
        )}

        {/* Connected photos — '사진첩 →'만 사진첩 이동(+고객 필터), 썸네일 클릭은 라이트박스 확대.
            전파 차단은 그 둘(버튼)에만 — 섹션 빈 영역/라벨 클릭은 카드로 버블링되어 상세가 열린다. */}
        {photoCount > 0 ? (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">연결 사진 {photoCount}</span>
              <button
                type="button"
                onClick={goToGallery}
                className="text-xs text-brand hover:underline"
                aria-label={`${customer.name} 사진첩에서 보기`}
              >
                사진첩 →
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {thumbnails.map((thumb, i) => {
                const isLast = i === thumbnails.length - 1;
                return (
                  <button
                    key={`${thumb.card_id}-${i}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                    className="aspect-square rounded-md overflow-hidden bg-muted relative cursor-zoom-in"
                    aria-label={`연결 사진 ${i + 1} 확대 보기`}
                  >
                    <ImageWithSkeleton src={thumb.url} alt="" fill sizes="48px" className="object-cover" />
                    {isLast && overflow > 0 && (
                      <div className="absolute inset-0 grid place-items-center bg-foreground/60 text-[10px] font-semibold text-white">
                        +{overflow}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            연결된 사진 없음
          </div>
        )}
      </CardContent>
    </Card>

    {/* 카드 밖에 렌더 — 카드 클릭(onSelect)과 완전히 분리. 썸네일 클릭 시 라이트박스만 열린다. */}
    <ImageLightbox
      images={thumbnails.map((t) => t.url)}
      index={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
      onNavigate={setLightboxIndex}
      caption={`${customer.name} 연결 사진`}
    />
    </>
  );
}
