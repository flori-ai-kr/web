import { redirect } from 'next/navigation';

// 발송 로그는 작업 로그의 '알림 발송' 탭으로 통합됨. 기존 링크/북마크 보존용 리다이렉트.
export default function NotificationLogsPage() {
  redirect('/console/job-runs?tab=notifications');
}
