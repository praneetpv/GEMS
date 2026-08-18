import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function ResultsPage({ searchParams }: { searchParams: { cycleId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasFullAccess(user.role)) redirect('/employee/goals');

  const cycles = await prisma.appraisalCycle.findMany({ orderBy: { startDate: 'desc' } });
  const activeCycleId = searchParams.cycleId ?? cycles[0]?.id;

  const scores = activeCycleId
    ? await prisma.appraisalScore.findMany({
        where: { cycleId: activeCycleId },
        include: { employee: true },
        orderBy: { overallRating: 'desc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">Org Results</h1>

      <div className="flex gap-2 flex-wrap">
        {cycles.map((c) => (
          <a
            key={c.id}
            href={`/hr/results?cycleId=${c.id}`}
            className={`text-xs rounded-full px-3 py-1 ${c.id === activeCycleId ? 'bg-accent text-white' : 'bg-white text-ink/60 shadow-sm'}`}
          >
            {c.name}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Overall Rating</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink/50">
                  No scores published for this cycle yet.
                </td>
              </tr>
            ) : null}
            {scores.map((s) => (
              <tr key={s.id} className="border-t border-black/5">
                <td className="px-4 py-3">{s.employee.name}</td>
                <td className="px-4 py-3 text-ink/50">{s.employee.orgRole ?? '—'}</td>
                <td className="px-4 py-3 text-ink/50">{s.publishedAt?.toLocaleDateString() ?? '—'}</td>
                <td className="px-4 py-3 font-medium">{s.overallRating?.toString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
