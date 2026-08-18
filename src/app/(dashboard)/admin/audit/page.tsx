import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasFullAccess(user.role)) redirect('/employee/goals');

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Audit Log</h1>
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-black/5">
        {entries.map((e) => (
          <div key={e.id} className="px-4 py-3 text-sm">
            <p>{e.summary}</p>
            <p className="text-xs text-ink/40 mt-1">
              {e.actor?.name ?? e.actorLabel ?? 'System'} &middot; {e.createdAt.toLocaleString()}
            </p>
          </div>
        ))}
        {entries.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink/50">No activity yet.</p> : null}
      </div>
    </div>
  );
}
