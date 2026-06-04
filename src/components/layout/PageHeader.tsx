import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 어드민 목록 페이지 공통 헤더.
 * 제목 + (옵션) 설명 + 우측 액션 슬롯. 7개 클라이언트에 복붙되던 헤더 마크업을 통일한다.
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
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
