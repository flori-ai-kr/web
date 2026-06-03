import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin-guard';
import { ConsoleShell } from '@/components/console/ConsoleShell';

export const metadata = { title: 'flori 운영 콘솔' };

// 운영자 전용 콘솔(/console/*) 진입점. requireAdmin()으로 is_admin 을 서버 검증한 뒤
// dense 콘솔 셸로 감싼다. 비운영자는 requireAdmin() 내부에서 /admin 으로 redirect 된다.
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <ConsoleShell userEmail={user.email || ''}>{children}</ConsoleShell>;
}
