import { redirect } from 'next/navigation';

// [AI 기능 비활성화] 인사이트 페이지 전체를 숨김 처리 — 대시보드로 리다이렉트.
// 아래 원본 코드와 insights-client.tsx, trends/, follows/, scraps/ 는 보존.
/*
import {
    getInstagramPosts,
    getLatestInstagramTimestamp,
    getRecentTrendsByCategory,
    getTrendCountsByCategory,
} from '@/lib/actions/insights';
import {getPostScraps, getScrapCounts, getTrendScraps} from '@/lib/actions/scraps';
import {InsightsClient} from './insights-client';

function getIsoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
*/

export default async function InsightsPage() {
  redirect('/admin');
}
