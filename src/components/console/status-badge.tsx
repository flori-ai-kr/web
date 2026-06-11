import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TONE: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info-soft text-info',
  muted: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/** 사업자 인증 상태 뱃지. null/미신청은 muted. */
export function VerificationBadge({ status }: { status: string | null }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    APPROVED: { tone: 'success', label: '승인' },
    PENDING: { tone: 'warning', label: '대기' },
    REJECTED: { tone: 'danger', label: '거절' },
  };
  const v = status ? map[status] : undefined;
  return <StatusBadge tone={v?.tone ?? 'muted'}>{v?.label ?? '미신청'}</StatusBadge>;
}

/** 구독 상태 뱃지. active/in_grace=활성류, none/null=없음. */
export function SubscriptionBadge({ status }: { status: string | null }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    active: { tone: 'success', label: '활성' },
    in_grace: { tone: 'warning', label: '결제유예' },
    expired: { tone: 'danger', label: '만료' },
    none: { tone: 'muted', label: '없음' },
  };
  const v = status ? map[status] : undefined;
  return <StatusBadge tone={v?.tone ?? 'muted'}>{v?.label ?? '없음'}</StatusBadge>;
}
