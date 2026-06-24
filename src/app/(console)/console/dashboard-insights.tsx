import type { ChurnReasonSlice, FunnelStage, RetentionCohortRow } from '@/types/admin';

// 퍼널 단계별 색(로즈 → 세이지 그라데이션). 단계 수만큼 순환.
const FUNNEL_COLORS = ['#A85475', '#b66686', '#c47b98', '#cf90a8', '#8A929E', '#6b7280'];

function pct(n: number, base: number): string {
  if (base <= 0) return '0%';
  return `${Math.round((n / base) * 100)}%`;
}

/** 활성화 퍼널 — 가입 대비 각 단계 잔존율 바. */
function FunnelPanel({ stages }: { stages: FunnelStage[] }) {
  const base = stages[0]?.count ?? 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">활성화 퍼널</h3>
        <span className="text-[11px] text-muted-foreground">가입 코호트 기준</span>
      </div>
      {stages.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-muted-foreground">데이터가 없습니다</p>
      ) : (
        <div className="space-y-2">
          {stages.map((s, i) => {
            const width = base > 0 ? Math.max((s.count / base) * 100, 3) : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[12px] text-muted-foreground">{s.label}</span>
                <div className="flex-1">
                  <div
                    className="flex h-8 items-center rounded-md px-2.5 text-[12px] font-semibold text-white"
                    style={{ width: `${width}%`, backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                  >
                    <span className="tabular-nums">{s.count.toLocaleString()}</span>
                    <span className="ml-1.5 opacity-75">{pct(s.count, base)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 탈퇴 사유 — 최근 30일 집계 바. */
function ChurnPanel({ reasons }: { reasons: ChurnReasonSlice[] }) {
  const total = reasons.reduce((acc, r) => acc + r.count, 0);
  const max = reasons.reduce((acc, r) => Math.max(acc, r.count), 0);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">탈퇴 사유</h3>
        <span className="text-[11px] text-muted-foreground">최근 30일 · {total}건</span>
      </div>
      {reasons.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-muted-foreground">데이터가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {reasons.map((r) => (
            <div key={r.reason}>
              <div className="mb-1 flex items-center justify-between text-[12.5px]">
                <span className="text-foreground">{r.reason}</span>
                <span className="tabular-nums text-muted-foreground">{r.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{ width: max > 0 ? `${Math.max((r.count / max) * 100, 4)}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 잔존율(0~1) → 셀 배경(로즈 농도). 높을수록 진하게.
function retentionBg(v: number): string {
  if (v >= 0.8) return '#A85475';
  if (v >= 0.6) return '#bf7491';
  if (v >= 0.45) return '#cf90a8';
  if (v >= 0.3) return '#dca9bd';
  if (v > 0) return '#ecd0db';
  return 'transparent';
}

function fmtWeek(d: string): string {
  const parts = d.split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${parts[2]}` : d;
}

/** 주간 리텐션 코호트 히트맵. */
function RetentionPanel({ rows }: { rows: RetentionCohortRow[] }) {
  const weeks = rows.reduce((acc, r) => Math.max(acc, r.retention.length), 0);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">주간 리텐션 코호트</h3>
        <span className="text-[11px] text-muted-foreground">잔존 = 해당 주 매출 1건 이상</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-muted-foreground">데이터가 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-center text-[12px]">
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="text-left font-medium">가입 주</th>
                <th className="font-medium">규모</th>
                {Array.from({ length: weeks }, (_, i) => (
                  <th key={i} className="font-medium">
                    W{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cohortWeek}>
                  <td className="text-left text-muted-foreground">{fmtWeek(row.cohortWeek)}</td>
                  <td className="tabular-nums text-muted-foreground">{row.cohortSize}</td>
                  {Array.from({ length: weeks }, (_, i) => {
                    const v = row.retention[i];
                    if (v == null) {
                      return (
                        <td key={i} className="text-muted-foreground/40">
                          —
                        </td>
                      );
                    }
                    const strong = v >= 0.45;
                    return (
                      <td key={i}>
                        <span
                          className="inline-block w-full rounded px-1.5 py-1 tabular-nums"
                          style={{ backgroundColor: retentionBg(v), color: strong ? '#fff' : 'inherit' }}
                        >
                          {Math.round(v * 100)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** 대시보드 하단 인사이트 묶음: 퍼널 + 탈퇴사유 + 리텐션. */
export function DashboardInsights({
  funnel,
  churn,
  retention,
}: {
  funnel: FunnelStage[];
  churn: ChurnReasonSlice[];
  retention: RetentionCohortRow[];
}) {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FunnelPanel stages={funnel} />
        </div>
        <ChurnPanel reasons={churn} />
      </section>
      <RetentionPanel rows={retention} />
    </div>
  );
}
