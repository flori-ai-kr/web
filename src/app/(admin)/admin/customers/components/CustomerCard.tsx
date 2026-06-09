'use client';

import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Lock, Pencil, Trash2} from 'lucide-react';
import {format} from 'date-fns';
import {formatCurrency} from '@/lib/utils';
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

  const goToGallery = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin/gallery?customer=${customer.id}`);
  };

  return (
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
          <p className="text-xs text-muted-foreground mt-2 truncate" title={customer.memo}>
            {customer.memo}
          </p>
        )}

        {/* Connected photos */}
        {photoCount > 0 ? (
          <button
            type="button"
            onClick={goToGallery}
            className="mt-3 pt-3 border-t border-border w-full text-left"
            aria-label={`${customer.name} 연결 사진 ${photoCount}장 — 사진첩에서 보기`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">연결 사진 {photoCount}</span>
              <span className="text-xs text-brand">사진첩 →</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {thumbnails.map((url, i) => {
                const isLast = i === thumbnails.length - 1;
                return (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted relative">
                    <Image src={url} alt="" fill sizes="48px" className="object-cover" unoptimized />
                    {isLast && overflow > 0 && (
                      <div className="absolute inset-0 grid place-items-center bg-foreground/60 text-[10px] font-semibold text-white">
                        +{overflow}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            연결된 사진 없음
          </div>
        )}
      </CardContent>
    </Card>
  );
}
