'use client';

import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {AlertTriangle, Crown, Lock, Pencil, Star, Trash2} from 'lucide-react';
import {format} from 'date-fns';
import {formatCurrency} from '@/lib/utils';
import type {Customer} from '@/types/database';

// Legacy 등급 라벨 맵 — CustomerDetailDialog(W4 리팩토링 대기)와 내보내기에서 사용.
// 동적 등급(grade NAME) 도입 후 카드 자체는 customer.grade 이름을 직접 표시한다.
export const gradeLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> | null; color: string; bg: string }> = {
  new: { label: '신규', icon: null, color: 'text-muted-foreground', bg: 'bg-muted' },
  regular: { label: '단골', icon: Star, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-muted' },
  vip: { label: 'VIP', icon: Crown, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/15' },
  blacklist: { label: '블랙', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-soft' },
};

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
  const thumbnails = customer.photo_thumbnails?.slice(0, 3) ?? [];
  const photoCount = customer.photo_count ?? 0;

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
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-brand-muted rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand">
                {customer.name.charAt(0)}
              </span>
            </div>
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
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5">
            {thumbnails.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={goToGallery}
                className="w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0 relative"
                aria-label={`${customer.name} 연결 사진 보기`}
              >
                <Image src={url} alt="" fill sizes="36px" className="object-cover" unoptimized />
              </button>
            ))}
            <button
              type="button"
              onClick={goToGallery}
              className="text-xs text-brand ml-1 hover:underline"
            >
              사진 {photoCount} →
            </button>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            연결된 사진 없음
          </div>
        )}
      </CardContent>
    </Card>
  );
}
