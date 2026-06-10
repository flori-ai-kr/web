import { redirect } from 'next/navigation';

// [AI 기능 비활성화] 스크랩 페이지 숨김 — 원본 코드·클라이언트 컴포넌트는 보존.
/*
import {getPostScraps, getTrendScraps} from '@/lib/actions/scraps';
import {ScrapsClient} from './scraps-client';
*/

export default async function ScrapsPage() {
  redirect('/admin');
}
