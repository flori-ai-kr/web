'use client';

import Link from 'next/link';
import { Users, Receipt, CreditCard, FileCheck, TriangleAlert } from 'lucide-react';
import { StatCard } from '@/components/console/StatCard';
import { TrendChart } from '@/components/console/TrendChart';
import type { AdminOverview, AiHealthResponse, StatRange, TimeseriesPoint } from '@/types/admin';

// 집계 금액은 만원 단위 표시(프로젝트 표준).
const won = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;

const RANGE_LABELS: Record<StatRange, string> = { '7d': '7일', '30d': '30일', '90d': '90일', all: '전체' };
const RANGES: StatRange[] = ['7d', '30d', '90d', 'all'];

export function OverviewClient({
  overview,
  health,
  signups,
  sales,
  range,
}: {
  overview: AdminOverview;
  health: AiHealthResponse;
  signups: TimeseriesPoint[];
  sales: TimeseriesPoint[];
  range: StatRange;
}) {
  const cmp = overview.comparison;
  return (
    <div className="space-y-5">
      {/* 날짜 필터 */}
      <div className="inline-flex gap-1 rounded-lg border border-border bg-card p-1">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/console?range=${r}`}
            aria-current={r === range ? 'page' : undefined}
            className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium ${
              r === range ? 'bg-brand text-brand-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {RANGE_LABELS[r]}
          </Link>
        ))}
      </div>

      {/* 인증 대기 콜아웃 */}
      {overview.verifications.pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13.5px] text-warning">
          <TriangleAlert className="h-[18px] w-[18px] shrink-0" />
          <span className="text-foreground">
            <b>사업자 인증 {overview.verifications.pending}건</b>이 승인 대기 중입니다.
          </span>
          <Link href="/console/verifications" className="ml-auto shrink-0 font-semibold text-brand">
            심사하러 가기 →
          </Link>
        </div>
      )}

      {/* 요약 카드 */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="전체 가입자"
          value={overview.users.total}
          changePct={cmp?.usersChangePct}
          hint={`활성 ${overview.users.active} · 온보딩 ${overview.users.onboarded}`}
          icon={Users}
          href="/console/users"
        />
        <StatCard
          label="매출 입력"
          value={overview.sales.entryCount}
          changePct={cmp?.salesCountChangePct}
          hint={`30일 기준 ${overview.sales.last30dCount}건 · 누적 ${won(overview.sales.totalAmount)}`}
          icon={Receipt}
        />
        <StatCard
          label="구독 활성"
          value={overview.subscriptions.active}
          hint={`유예 ${overview.subscriptions.inGrace} · 만료 ${overview.subscriptions.expired}`}
          icon={CreditCard}
          href="/console/subscriptions"
        />
        <StatCard
          label="인증 대기"
          value={overview.verifications.pending}
          hint={`승인 ${overview.verifications.approved} · 거절 ${overview.verifications.rejected}`}
          icon={FileCheck}
          href="/console/verifications"
        />
      </section>

      {/* 추이 차트 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">가입자 추이</h3>
          <p className="mb-3 text-[11.5px] text-muted-foreground">선택 기간 일별 신규 가입</p>
          <TrendChart type="line" data={signups} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">매출 입력 추이</h3>
          <p className="mb-3 text-[11.5px] text-muted-foreground">선택 기간 일별 매출 등록 건수</p>
          <TrendChart type="bar" data={sales} />
        </div>
      </section>

      {/* [AI 기능 비활성화] AI 헬스 섹션 — 출시 시 제거
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">AI 헬스</h3>
        <p className="mb-3 text-[11.5px] text-muted-foreground">ai-server / litellm 프록시 상태</p>
        <div className="flex flex-wrap gap-2">
          {health.targets.length === 0 ? (
            <span className="text-[13px] text-muted-foreground">설정된 헬스 타깃이 없습니다.</span>
          ) : (
            health.targets.map((t) => (
              <span
                key={t.name}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ${
                  t.status === 'UP' ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive'
                }`}
              >
                <span className="h-[7px] w-[7px] rounded-full bg-current" />
                {t.name} {t.status}
                {t.latencyMs != null ? ` · ${t.latencyMs}ms` : ''}
              </span>
            ))
          )}
        </div>
      </section>
      */}
    </div>
  );
}
