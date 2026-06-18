import type { GrantCategory, GrantProgram } from '@/types/grants';

export interface KotlinGrantProgram {
  id: string;
  source: string;
  title: string;
  agency: string | null;
  category: GrantCategory;
  target: string | null;
  summary: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  sourceUrl: string;
  dDay: number | null;
  createdAt: string;
}

export function mapGrantProgram(g: KotlinGrantProgram): GrantProgram {
  return {
    id: g.id,
    source: g.source,
    title: g.title,
    agency: g.agency ?? null,
    category: g.category,
    target: g.target ?? null,
    summary: g.summary ?? null,
    apply_start: g.applyStart ?? null,
    apply_end: g.applyEnd ?? null,
    source_url: g.sourceUrl,
    d_day: g.dDay ?? null,
    created_at: g.createdAt,
  };
}
