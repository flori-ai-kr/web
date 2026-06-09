'use client';

import type { ReservationStatistics } from '@/lib/actions/statistics';
import { StatKpiCard } from './StatKpiCard';
import { StatAreaChart } from './StatAreaChart';
import { StatBarList } from './StatBarList';
import { ReservationHeatmap } from './ReservationHeatmap';
import type { DeltaTone } from './StatKpiCard';

// ─── DOW mapping (Postgres: 0=일,1=월,...,6=토) ───────────────────────────────

const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * 시간대 버킷을 사람이 읽기 좋은 형태로 변환.
 * "15-17" → "15–17시", "19+" → "19시~"
 */
function formatBucket(bucket: string): string {
  if (bucket === '19+') return '19시~';
  const parts = bucket.split('-');
  if (parts.length === 2) return `${parts[0]}–${parts[1]}시`;
  return bucket;
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReservationStatPanelProps {
  data: ReservationStatistics;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReservationStatPanel({ data }: ReservationStatPanelProps) {
  const { kpi, timeseries, heatmap, dowDistribution, hourDistribution } = data;

  // Empty state — no reservations in the period
  if (kpi.total === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        이 기간에 예약이 없어요
      </div>
    );
  }

  // ── KPI cards ─────────────────────────────────────────────────────────────

  const busiestDowValue =
    kpi.busiestDow === -1 ? '—' : `${DOW_KR[kpi.busiestDow]}요일`;
  const busiestDowSub =
    kpi.busiestDow === -1 ? undefined : `전체의 ${kpi.busiestDowPct}%`;

  const peakHourValue = kpi.peakHourBucket ? formatBucket(kpi.peakHourBucket) : '—';
  const peakHourSub = kpi.peakHourBucket ? `전체의 ${kpi.peakHourPct}%` : undefined;

  const kpiCards = [
    {
      label: '총 예약',
      value: `${kpi.total.toLocaleString('ko-KR')}건`,
      delta: pctDeltaText(kpi.totalDeltaPct),
      deltaTone: pctDeltaTone(kpi.totalDeltaPct),
      sub: undefined,
    },
    {
      label: '일평균',
      value: `${kpi.dailyAvg}건`,
      delta: undefined,
      deltaTone: 'neutral' as DeltaTone,
      sub: undefined,
    },
    {
      label: '가장 바쁜 요일',
      value: busiestDowValue,
      delta: undefined,
      deltaTone: 'neutral' as DeltaTone,
      sub: busiestDowSub,
    },
    {
      label: '피크 시간대',
      value: peakHourValue,
      delta: undefined,
      deltaTone: 'neutral' as DeltaTone,
      sub: peakHourSub,
    },
  ];

  // ── Area chart data ────────────────────────────────────────────────────────

  const chartData = timeseries.map((p) => ({ date: p.date, value: p.count }));

  // ── DOW bar list — sorted by dow index ────────────────────────────────────

  const dowItems = [...dowDistribution]
    .sort((a, b) => a.dow - b.dow)
    .map((d) => ({
      label: `${DOW_KR[d.dow]}요일`,
      value: d.count,
      valueText: `${d.count}건`,
    }));

  // ── Hour bar list ─────────────────────────────────────────────────────────

  const hourItems = hourDistribution.map((h) => ({
    label: formatBucket(h.hourBucket),
    value: h.count,
    valueText: `${h.count}건`,
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
          일자별 예약 건수
        </p>
        <StatAreaChart
          data={chartData}
          type="area"
          valueFormatter={(n) => `${n}건`}
          height={160}
        />
      </div>

      {/* Full-width heatmap */}
      <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
        <div className="mb-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            요일 × 시간대 히트맵
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            색이 진할수록 그 시간대에 예약이 몰린 것
          </p>
        </div>
        <ReservationHeatmap cells={heatmap} />
      </div>

      {/* Distribution stat grid — 2 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Left: DOW distribution */}
        <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
            요일별 예약
          </p>
          <StatBarList
            items={dowItems}
            emptyMessage="데이터 없음"
          />
        </div>

        {/* Right: Hour distribution */}
        <div className="rounded-xl bg-card border border-border p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
            시간대별 예약
          </p>
          <StatBarList
            items={hourItems}
            emptyMessage="데이터 없음"
          />
        </div>
      </div>
    </div>
  );
}
