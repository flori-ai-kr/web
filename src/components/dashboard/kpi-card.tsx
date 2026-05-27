import type {ReactNode} from 'react';

/**
 * KPI cell matching the Rose mockup `.kpi` treatment:
 * - small uppercase muted label
 * - large value (Pretendard, tabular-nums) with an optional small unit
 * - optional sub line (rose-accented emphasis via `<b>`-style children)
 *
 * Designed to live inside a connected, hairline-divided grid (see KpiGroup).
 * No delta is fabricated here — `sub` is only rendered when the caller passes
 * real, already-computed content.
 */
export function KpiCard({
  label,
  value,
  unit,
  sub,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2.5 text-xl sm:text-2xl font-semibold leading-none tabular-nums text-foreground ${valueClassName ?? ''}`}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {sub && <p className="mt-2.5 text-[11.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/**
 * Connected KPI container — single bordered, rounded surface with vertical
 * hairline dividers between cells, exactly like the mockup `.kpis` block.
 */
export function KpiGroup({children}: {children: ReactNode}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 overflow-hidden rounded-xl border border-border bg-card [&>*]:border-border [&>*:not(:last-child)]:border-r [&>*:nth-child(-n+2)]:border-b md:[&>*:nth-child(-n+2)]:border-b-0 md:[&>*:nth-child(2)]:border-r [&>*:nth-child(2)]:border-r-0">
      {children}
    </div>
  );
}
