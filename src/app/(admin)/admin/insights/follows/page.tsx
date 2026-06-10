import { redirect } from 'next/navigation';

// [AI 기능 비활성화] 팔로우 페이지 숨김 — 원본 코드·클라이언트 컴포넌트는 보존.
/*
import {getInstagramAccounts, getInstagramPosts,} from '@/lib/actions/insights';
import {getScrapMap} from '@/lib/actions/scraps';
import type {InstagramRegion} from '@/types/database';
import {FollowsClient} from './follows-client';
*/

export default async function FollowsPage() {
  redirect('/admin');
}
