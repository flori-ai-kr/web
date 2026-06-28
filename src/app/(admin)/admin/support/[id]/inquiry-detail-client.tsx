'use client';

import {useState} from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { MyInquiry } from '@/types/support';
import {ImageLightbox} from '@/components/ui/image-lightbox';

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
  const images = inquiry.imageUrls.filter((url) => url.startsWith('https://'));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

      {/* 첨부 이미지 — 클릭 시 라이트박스(좌우 내비, 순서대로). 새 탭 링크 대신 인앱 확대. */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              aria-label={`첨부 이미지 ${i + 1} 확대 보기`}
              className="h-20 w-20 overflow-hidden rounded-lg border border-border cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`첨부 이미지 ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
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

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        caption={inquiry.title}
      />
    </div>
  );
}
