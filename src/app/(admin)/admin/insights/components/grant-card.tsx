'use client';

import {useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ddayMeta} from './dday';
import {ScrapButton} from './scrap-button';
import {GrantDetailDialog} from './grant-detail-dialog';
import {GRANT_CATEGORIES, type GrantProgram} from '@/types/grants';

interface GrantCardProps {
  program: GrantProgram;
  scraped: boolean;
}

export function GrantCard({program, scraped}: GrantCardProps) {
  const [open, setOpen] = useState(false);
  const cat = GRANT_CATEGORIES.find((c) => c.value === program.category);
  const dday = ddayMeta(program.d_day);
  // 외부 URL은 http(s)만 신뢰(서버도 적재 시 검증하나 이중 방어). 그 외 스킴이면 링크 미노출.
  const sourceUrl = /^https?:\/\//i.test(program.source_url) ? program.source_url : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${program.title} 상세 보기`}
        onClick={(e) => {
          // 내부 링크(원문 보기)·스크랩 버튼 클릭은 모달 열기에서 제외.
          if (!(e.target as HTMLElement).closest('a,button')) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="relative cursor-pointer rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {cat && (
            <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold', cat.badge)}>
              {cat.label}
            </span>
          )}
          {program.agency && <span className="text-[12px] text-muted-foreground">{program.agency}</span>}
          <span
            className={cn(
              'ml-auto mr-7 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              dday.cls,
            )}
          >
            {dday.label}
          </span>
        </div>

        <h4 className="line-clamp-2 pr-7 text-sm font-semibold text-foreground">{program.title}</h4>
        {program.target && (
          <p className="mt-1 line-clamp-1 pr-7 text-[12.5px] text-muted-foreground">{program.target}</p>
        )}
        {program.summary && (
          <p className="mt-1 line-clamp-3 pr-7 text-[12.5px] text-muted-foreground">{program.summary}</p>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
          >
            원문 보기
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}

        {/* 스크랩 토글 — 카드 onClick 가드(closest('a,button'))로 모달과 분리 */}
        <div className="absolute right-3 top-3">
          <ScrapButton targetType="grant" targetId={program.id} scraped={scraped} size="sm" />
        </div>
      </div>

      <GrantDetailDialog program={program} open={open} onClose={() => setOpen(false)} scraped={scraped} />
    </>
  );
}
