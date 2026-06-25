// 백그라운드 작업(cron) 라벨·주기 SSOT — 백엔드 JobNames 상수와 1:1.
// 작업 로그 화면과 감사 로그(target=job) 표시가 공유한다.

export const JOB_META: Record<string, { label: string; schedule: string }> = {
  flower_auction_ingest: { label: '경매시세 적재', schedule: '매일 06:30' },
  support_program_ingest: { label: 'K-Startup 적재', schedule: '매일 06:31' },
  bizinfo_ingest: { label: '비즈인포 적재', schedule: '매일 06:32' },
  reservation_reminder: { label: '픽업 리마인더', schedule: '5분마다' },
  daily_pickup_summary: { label: '일일 픽업 요약', schedule: '매일 08:00' },
  recurring_expense_generate: { label: '고정비 자동생성', schedule: '매일 00:30' },
};

export function jobLabel(jobName: string): string {
  return JOB_META[jobName]?.label ?? jobName;
}
