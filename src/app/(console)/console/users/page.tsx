import { listAdminUsers } from '@/lib/actions/admin-users';
import { UsersClient } from './users-client';

export default async function UsersPage() {
  const first = await listAdminUsers('', 0);
  return <UsersClient initial={first} />;
}
