'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { MyInquiry } from '@/types/support';

const CATEGORY_LABELS: Record<string, string> = {
  bug: '버그',
  feature: '기능제안',
  account: '계정',
  payment: '결제',
  feedback: '피드백',
  etc: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  open: '접수',
  in_progress: '처리중',
  resolved: '답변완료',
  closed: '종료',
};

export function InquiryDetailClient({ inquiry }: { inquiry: MyInquiry }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 고객센터
      </Link>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-semibold text-info">
          {CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
        </span>
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
          {STATUS_LABELS[inquiry.status] ?? inquiry.status}
        </span>
      </div>

      {/* 내 문의 */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 text-xs text-muted-foreground">
          {inquiry.createdAt.slice(0, 10).replaceAll('-', '.')} 작성
        </div>
        <div className="mb-2 text-[15px] font-semibold">{inquiry.title}</div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {inquiry.body}
        </div>
      </div>

      {/* 첨부 이미지 */}
      {inquiry.imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {inquiry.imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="첨부 이미지"
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
            </a>
          ))}
        </div>
      )}

      {/* 운영자 답변 */}
      {inquiry.answer && (
        <div className="rounded-lg border border-success/15 bg-success-soft p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success">
            ✅ 운영자 답변
            {inquiry.answeredAt && (
              <span className="font-normal text-success/70">
                · {inquiry.answeredAt.slice(0, 10).replaceAll('-', '.')}
              </span>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {inquiry.answer}
          </div>
        </div>
      )}
    </div>
  );
}
