'use client';

import { StatCard } from '@/components/console/StatCard';
import type { AdminOverview, AiHealthResponse } from '@/types/admin';

// 집계 금액은 만원 단위 표시(프로젝트 표준).
const won = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;

export function OverviewClient({
  overview,
  health,
}: {
  overview: AdminOverview;
  health: AiHealthResponse;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">개요</h1>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="전체 가입자"
          value={overview.users.total}
          hint={`활성 ${overview.users.active} · 온보딩 ${overview.users.onboarded}`}
        />
        <StatCard
          label="매출 입력"
          value={overview.sales.entryCount}
          hint={`최근 30일 ${overview.sales.last30dCount}건 · ${won(overview.sales.totalAmount)}`}
        />
        <StatCard
          label="구독 활성"
          value={overview.subscriptions.active}
          hint={`유예 ${overview.subscriptions.inGrace} · 만료 ${overview.subscriptions.expired}`}
        />
        <StatCard
          label="인증 대기"
          value={overview.verifications.pending}
          hint={`승인 ${overview.verifications.approved} · 거절 ${overview.verifications.rejected}`}
        />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-300">AI 헬스</h2>
        <div className="flex flex-wrap gap-2">
          {health.targets.length === 0 ? (
            <span className="text-sm text-zinc-500">설정된 헬스 타깃이 없습니다.</span>
          ) : (
            health.targets.map((t) => (
              <span
                key={t.name}
                className={`rounded px-2 py-1 text-xs ${
                  t.status === 'UP' ? 'bg-emerald-900 text-emerald-200' : 'bg-red-900 text-red-200'
                }`}
              >
                {t.name}: {t.status}
                {t.latencyMs != null ? ` (${t.latencyMs}ms)` : ''}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
