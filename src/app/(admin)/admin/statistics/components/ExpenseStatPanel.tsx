'use client';

import type { ExpensesStatistics } from '@/lib/actions/statistics';
import { StatKpiCard } from './StatKpiCard';
import { StatAreaChart } from './StatAreaChart';
import { StatDonut } from './StatDonut';
import type { DeltaTone } from './StatKpiCard';
import { formatManwon } from '@/lib/utils';

// ─── Brand-derived donut palette ─────────────────────────────────────────────

const DONUT_COLORS = ['#A85475', '#c98aa4', '#8A929E', '#bcc4cf', '#7a3d56'];

// ─── Delta helpers ────────────────────────────────────────────────────────────

function pctDeltaText(pct: number): string {
  return `${Math.abs(pct)}%`;
}

function pctDeltaTone(pct: number): DeltaTone {
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

function countDeltaText(delta: number): string {
  return `${Math.abs(delta)}건`;
}

function countDeltaTone(delta: number): DeltaTone {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'neutral';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExpenseStatPanelProps {
  data: ExpensesStatistics;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpenseStatPanel({ data }: ExpenseStatPanelProps) {
  const { kpi, timeseries, categoryDistribution } = data;

  // KPI cards
  const kpiCards = [
    {
      label: '총 지출',
      value: formatManwon(kpi.totalAmount),
      delta: pctDeltaText(kpi.totalAmountDeltaPct),
      deltaTone: pctDeltaTone(kpi.totalAmountDeltaPct),
    },
    {
      label: '지출 건수',
      value: `${kpi.count.toLocaleString('ko-KR')}건`,
      delta: countDeltaText(kpi.countDelta),
      deltaTone: countDeltaTone(kpi.countDelta),
    },
    {
      label: '매출 대비',
      value: `${kpi.expenseRatioPct}%`,
      deltaTone: 'neutral' as DeltaTone,
    },
    {
      label: '순이익',
      value: formatManwon(kpi.netProfit),
      delta: pctDeltaText(kpi.netProfitDeltaPct),
      deltaTone: pctDeltaTone(kpi.netProfitDeltaPct),
    },
  ];

  // Timeseries — split into two single-series arrays for StatAreaChart
  const expenseChartData = timeseries.map((p) => ({ date: p.date, value: p.expense }));
  const netProfitChartData = timeseries.map((p) => ({ date: p.date, value: p.netProfit }));

  // Category donut items
  const categoryItems = categoryDistribution.map((d, i) => ({
    label: d.label,
    value: d.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  return (
    <div className="space-y-3">
      {/* KPI grid — 4 columns (2 on mobile) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-xl bg-card border border-border overflow-hidden">
            <StatKpiCard
              label={card.label}
              value={card.value}
              delta={card.delta}
              deltaTone={card.deltaTone}
            />
          </div>
        ))}
      </div>

      {/* Full-width dual area chart: 지출 + 순이익 */}
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            일별 지출 · 순이익 추이
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--sage)' }}
                aria-hidden="true"
              />
              지출
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: 'var(--brand)' }}
                aria-hidden="true"
              />
              순이익
            </span>
          </div>
        </div>
        <StatAreaChart
          data={expenseChartData}
          type="area"
          color="var(--sage)"
          valueFormatter={formatManwon}
          height={140}
        />
        <div className="mt-3 pt-3 border-t border-border">
          <StatAreaChart
            data={netProfitChartData}
            type="area"
            color="var(--brand)"
            valueFormatter={formatManwon}
            height={120}
          />
        </div>
      </div>

      {/* Category donut — max-width ~520px per mockup */}
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5 max-w-[520px]">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
          지출 카테고리
        </p>
        {categoryItems.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground py-8"
            role="img"
            aria-label="데이터가 없습니다"
          >
            데이터 없음
          </div>
        ) : (
          <StatDonut items={categoryItems} />
        )}
      </div>
    </div>
  );
}
