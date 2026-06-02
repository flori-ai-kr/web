import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  hint,
  changePct,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  changePct?: number | null;
  icon: LucideIcon;
  href?: string;
}) {
  const hasChange = typeof changePct === 'number';
  const up = (changePct ?? 0) >= 0;

  const body = (
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[12.5px] text-muted-foreground">{label}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
          {hasChange && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold ${
                up ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive'
              }`}
            >
              {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {up ? '+' : ''}
              {changePct!.toFixed(1)}%
            </span>
          )}
        </div>
        {hint && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </div>
    </div>
  );

  const cls = `block rounded-xl border border-border bg-card p-4 ${
    href ? 'hover:border-brand/40 hover:shadow-[0_2px_10px_rgba(168,84,117,0.06)]' : ''
  }`;

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
