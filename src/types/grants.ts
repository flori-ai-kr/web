// 지원사업(support_programs) — 소진공·기업마당·K-Startup 수집.
// BFF GET /insights/grants 응답을 미러링한다.

export type GrantCategory = 'fund' | 'marketing' | 'education';

export interface GrantProgram {
  id: string;
  source: string;
  title: string;
  agency: string | null;
  category: GrantCategory;
  target: string | null;
  summary: string | null;
  apply_start: string | null;
  apply_end: string | null;
  source_url: string;
  /** 마감까지 남은 일수. 음수/null 가능 */
  d_day: number | null;
  created_at: string;
}

export interface GrantScrap {
  scrap: import('./insights').InsightScrap;
  program: GrantProgram;
}

export const GRANT_CATEGORIES = [
  { value: 'fund', label: '자금·융자', badge: 'bg-brand-muted text-brand' },
  { value: 'marketing', label: '마케팅·판로', badge: 'bg-[#e9f3ee] text-success' },
  { value: 'education', label: '교육', badge: 'bg-[#f0eafb] text-[#7b51c4]' },
] as const;

export const GRANT_CATEGORY_LABELS: Record<GrantCategory, string> = {
  fund: '자금·융자',
  marketing: '마케팅·판로',
  education: '교육',
};
