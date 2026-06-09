'use client';

import type { CustomerStatistics } from '@/lib/actions/statistics';
import { StatKpiCard } from './StatKpiCard';
import { StatAreaChart } from './StatAreaChart';
import { StatBarList } from './StatBarList';
import { StatSectionHeader } from './StatSectionHeader';
import type { DeltaTone } from './StatKpiCard';
import { formatManwon } from '@/lib/utils';

// ─── Grade / gender label helpers ────────────────────────────────────────────

type GradeKey = 'new' | 'regular' | 'vip' | 'blacklist';

const GRADE_KR: Record<string, string> = {
  new: '신규',
  regular: '단골',
  vip: 'VIP',
  blacklist: '블랙',
};

/**
 * Pill CSS classes per grade — dark-mode safe via Tailwind theme tokens.
 * VIP   → brand-ish (rose/dusty-pink)
 * 단골  → slate/muted
 * 신규  → green success
 * 블랙  → red danger
 */
const GRADE_PILL_CLS: Record<string, string> = {
  vip: 'bg-[#f3e7ef] text-[#A85475] dark:bg-[#3d1a27] dark:text-[#e8a8be]',
  regular: 'bg-[#e7ecf1] text-[#5A626D] dark:bg-[#2a2f36] dark:text-[#9aa5b1]',
  new: 'bg-[#e7f0ea] text-[#2e7d32] dark:bg-[#1a2e1b] dark:text-[#81c784]',
  blacklist: 'bg-[#fde8ec] text-[#c0395a] dark:bg-[#311016] dark:text-[#f48fb1]',
};

function gradeKr(grade: string): string {
  return GRADE_KR[grade as GradeKey] ?? grade;
}

function gradePillCls(grade: string): string {
  return GRADE_PILL_CLS[grade as GradeKey] ?? 'bg-muted text-muted-foreground';
}

function genderKr(gender: string | null): string {
  if (gender === 'male') return '남성';
  if (gender === 'female') return '여성';
  return '미입력';
}

// ─── Delta helpers ────────────────────────────────────────────────────────────

function countDeltaTone(delta: number): DeltaTone {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'neutral';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomerStatPanelProps {
  data: CustomerStatistics;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerStatPanel({ data }: CustomerStatPanelProps) {
  const { kpi, timeseries, gradeDistribution, genderDistribution, topCustomers } = data;

  // Empty state — no customers in the period
  if (kpi.total === 0 && kpi.newCustomers === 0) {
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        이 기간에 고객 데이터가 없어요
      </div>
    );
  }

  // ── KPI cards ─────────────────────────────────────────────────────────────

  const kpiCards = [
    {
      label: '총 고객',
      value: `${kpi.total.toLocaleString('ko-KR')}명`,
      delta: undefined,
      deltaTone: 'neutral' as DeltaTone,
      sub: undefined,
      highlight: true,
    },
    {
      label: '신규',
      value: `${kpi.newCustomers.toLocaleString('ko-KR')}명`,
      delta: `${Math.abs(kpi.newDelta)}명`,
      deltaTone: countDeltaTone(kpi.newDelta),
      sub: undefined,
      highlight: false,
    },
    {
      label: '재방문',
      value: `${kpi.returningCustomers.toLocaleString('ko-KR')}명`,
      delta: `${Math.abs(kpi.returningDelta)}명`,
      deltaTone: countDeltaTone(kpi.returningDelta),
      sub: undefined,
      highlight: false,
    },
    {
      label: '재방문율',
      value: `${kpi.returningRatePct}%`,
      delta: undefined,
      deltaTone: 'neutral' as DeltaTone,
      sub: undefined,
      highlight: false,
    },
  ];

  // ── Area chart ────────────────────────────────────────────────────────────

  const chartData = timeseries.map((p) => ({ date: p.date, value: p.newCustomers }));

  // ── Grade bar list ────────────────────────────────────────────────────────

  const gradeItems = gradeDistribution.map((g) => ({
    label: gradeKr(g.grade),
    value: g.count,
    valueText: `${g.count}명`,
  }));

  // ── Gender bar list ───────────────────────────────────────────────────────

  const genderItems = genderDistribution.map((g) => ({
    label: genderKr(g.gender),
    value: g.count,
    valueText: `${g.count}명`,
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

      {/* Full-width area chart — 신규 고객 추이 */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4">
        <StatSectionHeader title="신규 고객 추이" />
        <StatAreaChart
          data={chartData}
          type="area"
          valueFormatter={(n) => `${n}명`}
          height={160}
        />
      </div>

      {/* stat grid — 2 columns (1 on mobile): TOP table left, distributions right */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.6fr_1fr]">
        {/* Left: TOP 고객 테이블 */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <StatSectionHeader title="TOP 고객 (구매액)" />
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full border-collapse" aria-label="TOP 고객 목록">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-muted-foreground px-1.5 pb-2 border-b border-border font-medium">
                      고객
                    </th>
                    <th className="text-left text-xs text-muted-foreground px-1.5 pb-2 border-b border-border font-medium">
                      등급
                    </th>
                    <th className="text-right text-xs text-muted-foreground px-1.5 pb-2 border-b border-border font-medium">
                      구매
                    </th>
                    <th className="text-right text-xs text-muted-foreground px-1.5 pb-2 border-b border-border font-medium">
                      누적액
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, idx) => (
                    <tr key={c.customerId ?? `${c.name}-${idx}`}>
                      <td className="px-1.5 py-2.5 border-b border-border text-[13px] text-foreground">
                        {c.name}
                      </td>
                      <td className="px-1.5 py-2.5 border-b border-border">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${gradePillCls(c.grade)}`}
                        >
                          {gradeKr(c.grade)}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 border-b border-border text-right tabular-nums text-[13px] text-muted-foreground">
                        {c.purchaseCount}회
                      </td>
                      <td className="px-1.5 py-2.5 border-b border-border text-right tabular-nums text-[13px] text-foreground">
                        {formatManwon(c.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: 등급 + 성별 분포 */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-5">
          <div>
            <StatSectionHeader title="등급 분포" />
            <StatBarList items={gradeItems} emptyMessage="데이터 없음" />
          </div>
          <div>
            <StatSectionHeader title="성별" />
            <StatBarList items={genderItems} emptyMessage="데이터 없음" />
          </div>
        </div>
      </div>
    </div>
  );
}
