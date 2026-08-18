import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';

const HOME_BY_ROLE: Record<string, string> = {
  EMPLOYEE: '/employee/goals',
  SUPERVISOR: '/supervisor/team',
  HR: '/hr/cycles',
  SUPER_ADMIN: '/hr/cycles',
};

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(HOME_BY_ROLE[user.role] ?? '/employee/goals');
}
