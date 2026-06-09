import { cn } from '@/lib/utils';

export type DeltaTone = 'up' | 'down' | 'neutral';

export interface StatKpiCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: DeltaTone;
  sub?: string;
}

export function StatKpiCard({ label, value, delta, deltaTone = 'neutral', sub }: StatKpiCardProps) {
  const deltaGlyph = deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : '–';

  const deltaCls = cn(
    'inline-flex items-center gap-1 text-xs font-bold mt-1.5 rounded-full px-2 py-0.5',
    deltaTone === 'up' && 'text-success bg-success-soft',
    deltaTone === 'down' && 'text-danger bg-danger-soft',
    deltaTone === 'neutral' && 'text-muted-foreground bg-muted',
  );

  return (
    <div className="p-4 sm:p-5 space-y-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {delta !== undefined && (
        <span className={deltaCls} aria-label={`${deltaTone === 'up' ? '증가' : deltaTone === 'down' ? '감소' : '변화 없음'}: ${delta}`}>
          <span aria-hidden="true">{deltaGlyph}</span>
          {delta}
        </span>
      )}
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
