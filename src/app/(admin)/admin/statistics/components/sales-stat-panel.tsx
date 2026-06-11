'use client';

import type { SalesStatistics } from '@/lib/actions/statistics';
import { StatKpiCard } from './stat-kpi-card';
import { StatBarList } from './stat-bar-list';
import { StatAreaChart } from './stat-area-chart';
import { StatDonut } from './stat-donut';
import { StatSectionHeader } from './stat-section-header';
import type { DeltaTone } from './stat-kpi-card';
import { formatManwon } from '@/lib/utils';

// ─── Brand-derived donut palette ─────────────────────────────────────────────

const DONUT_COLORS = ['#A85475', '#c98aa4', '#8A929E', '#bcc4cf', '#7a3d56'];

/** 정확한 원화 표시 (객단가 등 낮은 금액용) */
function formatWon(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

// ─── Delta helpers ────────────────────────────────────────────────────────────

function pctDeltaText(pct: number): string {
  // 글리프(▲/▼)는 StatKpiCard가 deltaTone으로 렌더하므로 크기만 반환
  return `${Math.abs(pct)}%`;
}

function pctDeltaTone(pct: number): DeltaTone {
  if (pct > 0) return 'up';
  if (pct < 0) return 'down';
  return 'neutral';
}

function countDeltaText(delta: number): string {
  // 글리프는 StatKpiCard가 렌더
  return `${Math.abs(delta)}건`;
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
      highlight: true,
    },
    {
      label: '매출 건수',
      value: `${kpi.count.toLocaleString('ko-KR')}건`,
      delta: countDeltaText(kpi.countDelta),
      deltaTone: countDeltaTone(kpi.countDelta),
      highlight: false,
    },
    {
      label: '평균 객단가',
      value: formatWon(kpi.avgOrderValue),
      delta: pctDeltaText(kpi.avgOrderValueDeltaPct),
      deltaTone: pctDeltaTone(kpi.avgOrderValueDeltaPct),
      highlight: false,
    },
    {
      label: '미수 잔액',
      value: formatManwon(kpi.unpaidBalance),
      sub: `${kpi.unpaidCount}건 미정산`,
      deltaTone: 'neutral' as DeltaTone,
      highlight: false,
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
          <StatKpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            delta={card.delta}
            deltaTone={card.deltaTone}
            sub={card.sub}
            highlight={card.highlight}
          />
        ))}
      </div>

      {/* Full-width area chart */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <StatSectionHeader title="일별 매출 추이" />
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
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <StatSectionHeader title="카테고리별 매출" />
          <StatBarList
            items={categoryItems}
            emptyMessage="카테고리 데이터가 없습니다"
          />
        </div>

        {/* Right: payment donut + channel barlist */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <StatSectionHeader title="결제방식" />
            <StatDonut items={paymentItems} />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm p-4">
            <StatSectionHeader title="예약 채널" />
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
