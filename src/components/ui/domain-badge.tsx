import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 매출/지출/고객 등 도메인 라벨 배지(카테고리·결제수단·채널).
 * 색은 DB에 저장된 hex(`color`)를 `--badge` 커스텀 프로퍼티로 주입하고,
 * 실제 명도 처리는 globals.css의 `.domain-badge` / `.dark .domain-badge`가 담당한다.
 * → 라이트는 기존 인라인 `${color}40` 패턴과 동일, 다크는 카드색 기반으로 대비 보정.
 *
 * color가 없으면(미지정) 토큰 기반 muted 배지로 폴백한다(다크 대응 포함).
 */
export function DomainBadge({
  color,
  children,
  className,
  style,
}: {
  color?: string | null;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const base = 'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium';

  // 방어 심층: 색은 저장 시 colorSchema(hex)로 검증되지만, 읽기 경로에서도
  // hex가 아니면 muted로 폴백해 CSS var 오염을 차단한다.
  const safeColor = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;

  if (!safeColor) {
    return (
      <span className={cn(base, 'bg-muted text-muted-foreground', className)} style={style}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn('domain-badge', base, className)}
      style={{ ['--badge' as string]: safeColor, ...style }}
    >
      {children}
    </span>
  );
}
