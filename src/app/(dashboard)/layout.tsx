import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { roleLabel, hasFullAccess, isSuperAdmin } from '@/lib/roles';
import { logout } from '../logout-action';

const NAV_ITEMS: { href: string; label: string; show: (role: string) => boolean }[] = [
  { href: '/employee/goals', label: 'My Goals', show: () => true },
  { href: '/employee/reviews', label: 'My Reviews', show: () => true },
  { href: '/employee/scores', label: 'My Scores', show: () => true },
  { href: '/supervisor/team', label: 'My Team', show: (role) => role === 'SUPERVISOR' || isSuperAdmin(role) },
  { href: '/hr/cycles', label: 'Appraisal Cycles', show: (role) => hasFullAccess(role) },
  { href: '/hr/results', label: 'Org Results', show: (role) => hasFullAccess(role) },
  { href: '/admin/users', label: 'Users', show: (role) => isSuperAdmin(role) },
  { href: '/admin/import', label: 'Import Roster', show: (role) => isSuperAdmin(role) },
  { href: '/admin/audit', label: 'Audit Log', show: (role) => hasFullAccess(role) },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const visibleItems = NAV_ITEMS.filter((item) => item.show(user.role));

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-navy text-white flex flex-col">
        <div className="px-5 py-6">
          <p className="font-serif font-semibold text-lg">Dbiz Appraisal</p>
          <p className="text-xs text-white/60 mt-1">{user.name}</p>
          <p className="text-xs text-white/40">{roleLabel(user.role)}</p>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {visibleItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-navy-light hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <form action={logout} className="px-2 pb-6">
          <button type="submit" className="w-full text-left rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-navy-light hover:text-white transition-colors">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}
