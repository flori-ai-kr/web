import { cn } from '@/lib/utils';

export type DeltaTone = 'up' | 'down' | 'neutral';

export interface StatKpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: DeltaTone;
  sub?: string;
  highlight?: boolean;
}

export function StatKpiCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  sub,
  highlight = false,
}: StatKpiCardProps) {
  const deltaGlyph = deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : '–';

  const deltaCls = cn(
    'text-[11.5px] mt-1.5',
    deltaTone === 'up' && 'text-success',
    deltaTone === 'down' && 'text-danger',
    deltaTone === 'neutral' && 'text-muted-foreground',
  );

  return (
    <div
      className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-1"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-xl font-bold tracking-tight tabular-nums',
          highlight ? 'text-brand' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {delta !== undefined && (
        <span
          className={deltaCls}
          aria-label={`${deltaTone === 'up' ? '증가' : deltaTone === 'down' ? '감소' : '변화 없음'}: ${delta}`}
        >
          <span aria-hidden="true">{deltaGlyph}</span>
          {' '}
          {delta}
        </span>
      )}
      {sub && <p className="text-[11.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
