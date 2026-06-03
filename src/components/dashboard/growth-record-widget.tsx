'use client';

import {Flame} from 'lucide-react';

// TODO: replace with real data when AI/aggregation backend is ready
const MOCK_GROWTH = {
  season: '5월 시즌',
  level: 4,
  progressPct: 68,
  nextLevelLabel: 'Lv.5 플로리스트',
  remainingLabel: '매출 60만원 남음',
  streakDays: 12,
  bestStreakDays: 18,
  badges: [
    {mark: '1', label: '첫 매출', locked: false},
    {mark: 'W', label: '주말 마감왕', locked: false},
    {mark: '＋', label: '월 500만원', locked: true},
  ],
};

export function GrowthRecordWidget() {
  const {progressPct} = MOCK_GROWTH;

  return (
    <section
      aria-label="성장 기록"
      className="flex flex-col gap-[18px] rounded-2xl border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">성장 기록</h2>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {MOCK_GROWTH.season}
        </span>
      </div>

      {/* Level ring */}
      <div className="flex items-center gap-[18px]">
        <div
          className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--brand) 0 ${progressPct}%, var(--border) ${progressPct}% 100%)`,
          }}
          role="img"
          aria-label={`레벨 ${MOCK_GROWTH.level}, 다음 레벨까지 ${progressPct}% 진행`}
        >
          <div className="flex h-[66px] w-[66px] flex-col items-center justify-center gap-px rounded-full bg-card">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Lv
            </span>
            <span className="font-serif text-[26px] font-semibold leading-none text-brand">
              {MOCK_GROWTH.level}
            </span>
          </div>
        </div>
        <div>
          <p className="font-serif text-[22px] font-semibold text-foreground">
            <span className="text-brand">{progressPct}%</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {MOCK_GROWTH.nextLevelLabel}까지
            <br />
            {MOCK_GROWTH.remainingLabel}
          </p>
        </div>
      </div>

      {/* Streak chip */}
      <div className="flex items-center gap-[11px] rounded-xl border border-brand/25 bg-brand-muted px-3.5 py-3">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-card"
          aria-hidden="true"
        >
          <Flame className="h-[17px] w-[17px] text-brand" />
        </span>
        <p className="text-[12.5px] text-foreground">
          <span className="font-bold tabular-nums text-brand">{MOCK_GROWTH.streakDays}일</span> 연속
          매출 기록 중 · 최고 기록 {MOCK_GROWTH.bestStreakDays}일
        </p>
      </div>

      {/* Badges */}
      <div>
        <p className="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          획득 배지
        </p>
        <ul className="flex flex-wrap gap-2">
          {MOCK_GROWTH.badges.map((b) => (
            <li
              key={b.label}
              className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-2.5 text-[11px] font-semibold ${
                b.locked
                  ? 'border-border bg-muted/50 text-muted-foreground'
                  : 'border-brand/25 bg-brand-muted text-brand'
              }`}
            >
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold ${
                  b.locked ? 'bg-muted text-muted-foreground' : 'text-white'
                }`}
                style={b.locked ? undefined : {background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
                aria-hidden="true"
              >
                {b.mark}
              </span>
              {b.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
