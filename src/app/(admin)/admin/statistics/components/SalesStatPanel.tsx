'use client';

import type { SalesStatistics } from '@/lib/actions/statistics';
import { StatKpiCard } from './StatKpiCard';
import { StatBarList } from './StatBarList';
import { StatAreaChart } from './StatAreaChart';
import { StatDonut } from './StatDonut';
import type { DeltaTone } from './StatKpiCard';

// ─── Brand-derived donut palette ─────────────────────────────────────────────

const DONUT_COLORS = ['#A85475', '#c98aa4', '#8A929E', '#bcc4cf', '#7a3d56'];

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * 집계 금액을 만원 단위로 표시.
 * 예: 6,420,000 → "642만원", 9,000 → "₩9,000" (1만 미만은 원 단위 그대로)
 */
function formatManwon(n: number): string {
  if (n < 10000) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }
  const manwon = Math.round(n / 10000);
  return `${manwon.toLocaleString('ko-KR')}만원`;
}

/** 정확한 원화 표시 (객단가 등 낮은 금액용) */
function formatWon(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

// ─── Delta helpers ────────────────────────────────────────────────────────────

function pctDeltaText(pct: number): string {
  const sign = pct >= 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(pct)}%`;
}

function pctDeltaTone(pct: number): DeltaTone {
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

function countDeltaText(delta: number): string {
  const sign = delta >= 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(delta)}건`;
}

function countDeltaTone(delta: number): DeltaTone {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'neutral';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesStatPanelProps {
  data: SalesStatistics;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SalesStatPanel({ data }: SalesStatPanelProps) {
  const { kpi, timeseries, categoryDistribution, paymentDistribution, channelDistribution } = data;

  // KPI cards
  const kpiCards = [
    {
      label: '총 매출',
      value: formatManwon(kpi.totalAmount),
      delta: pctDeltaText(kpi.totalAmountDeltaPct),
      deltaTone: pctDeltaTone(kpi.totalAmountDeltaPct),
    },
    {
      label: '매출 건수',
      value: `${kpi.count.toLocaleString('ko-KR')}건`,
      delta: countDeltaText(kpi.countDelta),
      deltaTone: countDeltaTone(kpi.countDelta),
    },
    {
      label: '평균 객단가',
      value: formatWon(kpi.avgOrderValue),
      delta: pctDeltaText(kpi.avgOrderValueDeltaPct),
      deltaTone: pctDeltaTone(kpi.avgOrderValueDeltaPct),
    },
    {
      label: '미수 잔액',
      value: formatManwon(kpi.unpaidBalance),
      sub: `${kpi.unpaidCount}건 미정산`,
      deltaTone: 'neutral' as DeltaTone,
    },
  ];

  // Timeseries for area chart
  const chartData = timeseries.map((p) => ({ date: p.date, value: p.amount }));

  // Distribution lists
  const categoryItems = categoryDistribution.map((d) => ({
    label: d.label,
    value: d.amount,
    valueText: formatManwon(d.amount),
  }));

  const paymentItems = paymentDistribution.map((d, i) => ({
    label: d.label,
    value: d.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  const channelItems = channelDistribution.map((d) => ({
    label: d.label,
    value: d.amount,
    valueText: formatManwon(d.amount),
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
              sub={card.sub}
            />
          </div>
        ))}
      </div>

      {/* Full-width area chart */}
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
          일별 매출 추이
        </p>
        <StatAreaChart
          data={chartData}
          type="area"
          valueFormatter={formatManwon}
          height={160}
        />
      </div>

      {/* Stat grid — category barlist | payment donut + channel barlist */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Left: category distribution */}
        <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
            카테고리별 매출
          </p>
          <StatBarList
            items={categoryItems}
            emptyMessage="카테고리 데이터가 없습니다"
          />
        </div>

        {/* Right: payment donut + channel barlist */}
        <div className="space-y-3">
          <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
              결제방식
            </p>
            <StatDonut items={paymentItems} />
          </div>

          <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
              예약 채널
            </p>
            <StatBarList
              items={channelItems}
              emptyMessage="채널 데이터가 없습니다"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
