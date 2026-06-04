import { redirect } from 'next/navigation';

// [AI 기능 비활성화] AI 헬스 페이지 숨김 — 원본 코드·클라이언트 컴포넌트는 보존.
/*
import { getAiHealth } from '@/lib/actions/admin-health';
import { HealthClient } from './health-client';
*/

export default async function HealthPage() {
  redirect('/console');
}
