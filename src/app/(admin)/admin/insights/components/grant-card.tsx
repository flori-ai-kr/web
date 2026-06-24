'use client';

import {ExternalLink} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ScrapButton} from './scrap-button';
import {GRANT_CATEGORIES, type GrantProgram} from '@/types/grants';

interface GrantCardProps {
  program: GrantProgram;
  scraped: boolean;
}

/** D-day 숫자 → 배지 라벨 + 긴급도 색. */
function ddayMeta(dDay: number | null): {label: string; cls: string} {
  if (dDay == null) return {label: '상시', cls: 'bg-[#eef1f5] text-muted-foreground'};
  if (dDay < 0) return {label: '마감', cls: 'bg-[#eef1f5] text-muted-foreground'};
  if (dDay === 0) return {label: '마감 D-DAY', cls: 'bg-danger-soft text-danger'};
  if (dDay <= 7) return {label: `마감 D-${dDay}`, cls: 'bg-danger-soft text-danger'};
  if (dDay <= 14) return {label: `마감 D-${dDay}`, cls: 'bg-[#fdf4e3] text-[#b07d18]'};
  return {label: `마감 D-${dDay}`, cls: 'bg-[#eef1f5] text-muted-foreground'};
}

export function GrantCard({program, scraped}: GrantCardProps) {
  const cat = GRANT_CATEGORIES.find((c) => c.value === program.category);
  const dday = ddayMeta(program.d_day);

  return (
    <div className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {cat && (
          <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold', cat.badge)}>
            {cat.label}
          </span>
        )}
        {program.agency && (
          <span className="text-[12px] text-muted-foreground">{program.agency}</span>
        )}
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

      <a
        href={program.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
      >
        원문 보기
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>

      <div className="absolute right-3 top-3">
        <ScrapButton targetType="grant" targetId={program.id} scraped={scraped} size="sm" />
      </div>
    </div>
  );
}
