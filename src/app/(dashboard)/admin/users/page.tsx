import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { updateUserRole } from './actions';

export const dynamic = 'force-dynamic';

const ROLES = ['EMPLOYEE', 'SUPERVISOR', 'HR', 'SUPER_ADMIN'] as const;

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isSuperAdmin(user.role)) redirect('/employee/goals');

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, include: { manager: true } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Users</h1>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Employee No</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-black/5">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 text-ink/50">{u.employeeNo}</td>
                <td className="px-4 py-3 text-ink/50">{u.manager?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <form action={updateUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="rounded-lg border border-black/10 px-2 py-1 text-xs">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs text-accent hover:underline">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
