import type {ReactNode} from 'react';

/**
 * Editorial section header matching the Pencil dashboard reference:
 * Korean title in Pretendard sans (Cormorant has no Korean glyphs and falls
 * back to sans in the design) + uppercase muted meta, sitting on a hairline.
 */
export function SectionHeader({
  title,
  meta,
  action,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h2 className="font-sans text-h3 font-semibold leading-h3 tracking-tight text-foreground truncate">
          {title}
        </h2>
        {meta && (
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground shrink-0">
            {meta}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
