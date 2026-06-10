import { redirect } from 'next/navigation';

// [AI 기능 비활성화] 트렌드 페이지 숨김 — 원본 코드·클라이언트 컴포넌트는 보존.
/*
import {getTrendArticles} from '@/lib/actions/insights';
import {getScrapMap} from '@/lib/actions/scraps';
import type {TrendCategory} from '@/types/database';
import {TrendsClient} from './trends-client';
*/

export default async function TrendsPage() {
  redirect('/admin');
}
