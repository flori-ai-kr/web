'use client';

import {ExternalLink} from 'lucide-react';
import {cn} from '@/lib/utils';
import {ddayMeta} from './dday';
import {ScrapButton} from './scrap-button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {GRANT_CATEGORIES, type GrantProgram} from '@/types/grants';

interface GrantDetailDialogProps {
  program: GrantProgram | null;
  open: boolean;
  onClose: () => void;
  scraped: boolean;
}

/** 신청기간 표시 — 상시/한쪽만/양쪽 모두 처리. ISO(YYYY-MM-DD) → YYYY.MM.DD. */
function formatPeriod(start: string | null, end: string | null): string {
  const f = (d: string) => d.replaceAll('-', '.');
  if (!start && !end) return '상시 모집';
  if (start && end) return `${f(start)} ~ ${f(end)}`;
  if (end) return `~ ${f(end)}`;
  return `${f(start as string)} ~`;
}

/** 지원사업 카드 클릭 시 전체 설명을 보여주는 상세 모달. 원문 보기 딥링크 포함. */
export function GrantDetailDialog({program, open, onClose, scraped}: GrantDetailDialogProps) {
  if (!program) return null;
  const cat = GRANT_CATEGORIES.find((c) => c.value === program.category);
  const dday = ddayMeta(program.d_day);
  // 외부 URL은 http(s)만 신뢰(서버 적재 검증과 이중 방어). 그 외 스킴이면 링크 미노출.
  const sourceUrl = /^https?:\/\//i.test(program.source_url) ? program.source_url : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="text-left">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {cat && (
              <span
                className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold', cat.badge)}
              >
                {cat.label}
              </span>
            )}
            {program.agency && <span className="text-xs text-muted-foreground">{program.agency}</span>}
            <span
              className={cn(
                'ml-auto mr-7 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                dday.cls,
              )}
            >
              {dday.label}
            </span>
          </div>
          <DialogTitle className="text-lg leading-snug">{program.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {program.target && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">지원대상</h4>
              <p className="text-sm text-foreground">{program.target}</p>
            </div>
          )}
          {program.summary && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">사업개요</h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{program.summary}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>신청기간 · {formatPeriod(program.apply_start, program.apply_end)}</span>
            <div className="flex shrink-0 items-center gap-3">
              <ScrapButton targetType="grant" targetId={program.id} scraped={scraped} size="sm" label="스크랩" />
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                >
                  원문 보기
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
