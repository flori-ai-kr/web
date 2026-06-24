'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { MyInquiry } from '@/types/support';

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능제안',
  account: '계정',
  payment: '결제',
  feedback: '피드백',
  etc: '기타',
};

const CATEGORY_VARIANTS: Record<string, string> = {
  bug: 'bg-danger-soft text-danger',
  feature: 'bg-info-soft text-info',
  feedback: 'bg-success-soft text-success',
  account: 'bg-warning-soft text-warning',
  payment: 'bg-warning-soft text-warning',
  etc: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  open: '접수',
  in_progress: '처리중',
  resolved: '답변완료',
  closed: '종료',
};

const STATUS_VARIANTS: Record<string, string> = {
  open: 'bg-warning-soft text-warning',
  in_progress: 'bg-info-soft text-info',
  resolved: 'bg-success-soft text-success',
  closed: 'bg-muted text-muted-foreground',
};

export function InquiryCard({ inquiry }: { inquiry: MyInquiry }) {
  return (
    <Link
      href={`/admin/support/${inquiry.id}`}
      className="block rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-brand/40"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_VARIANTS[inquiry.category] ?? CATEGORY_VARIANTS.etc}`}>
          {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
        </span>
        <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_VARIANTS[inquiry.status] ?? STATUS_VARIANTS.open}`}>
          {STATUS_LABELS[inquiry.status] ?? inquiry.status}
        </span>
      </div>
      <div className="text-sm font-medium">{inquiry.title}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{inquiry.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
        {inquiry.answer && (
          <span className="font-medium text-success">· 답변 확인 →</span>
        )}
      </div>
    </Link>
  );
}
