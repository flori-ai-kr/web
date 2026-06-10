import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 어드민 목록 페이지 공통 헤더.
 * 제목 + (옵션) 설명 + 우측 액션 슬롯. 7개 클라이언트에 복붙되던 헤더 마크업을 통일한다.
 * 모바일에서는 세로 스택, sm 이상에서 가로 정렬(기존 패턴과 동일 — 시각 변화 없음).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto">{actions}</div>
      )}
    </div>
  );
}
