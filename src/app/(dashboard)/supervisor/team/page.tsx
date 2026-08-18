import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  l1_submitted: 'L1 review submitted.',
  l2_submitted: 'L2 review submitted.',
};
const ERRORS: Record<string, string> = {
  l1_not_submitted: "That goal's L1 review hasn't been submitted yet.",
};

export default async function SupervisorTeamPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'SUPERVISOR' && !isSuperAdmin(user.role)) redirect('/employee/goals');

  const reports = await prisma.user.findMany({
    where: { managerId: user.id },
    orderBy: { name: 'asc' },
    include: {
      goalsOwned: {
        where: { cycle: { status: { in: ['ACTIVE', 'REVIEW'] } } },
        include: { cycle: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const pendingL2 = await prisma.review.findMany({
    where: { level: 'L2', status: 'PENDING', reviewerId: user.id },
    include: { goal: { include: { owner: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif font-semibold">My Team</h1>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      {pendingL2.length > 0 ? (
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-2">
          <h2 className="font-medium">Pending L2 reviews (skip-level)</h2>
          {pendingL2.map((r) => (
            <a key={r.id} href={`/supervisor/review/l2/${r.id}`} className="block rounded-lg px-3 py-2 text-sm bg-paper hover:bg-black/5">
              {r.goal.owner.name} &middot; {r.goal.title}
            </a>
          ))}
        </section>
      ) : null}

      <div className="space-y-4">
        {reports.length === 0 ? <p className="text-sm text-ink/50">No direct reports.</p> : null}
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <p className="font-medium">{report.name}</p>
              <a href={`/supervisor/goals/${report.id}`} className="text-xs text-accent hover:underline">
                + Add goal
              </a>
            </div>
            <div className="mt-3 space-y-2">
              {report.goalsOwned.length === 0 ? <p className="text-sm text-ink/50">No active goals.</p> : null}
              {report.goalsOwned.map((g) => (
                <div key={g.id} className="rounded-lg bg-paper px-3 py-2 flex items-center justify-between text-sm">
                  <span>{g.title}</span>
                  <span className="space-x-3 text-xs">
                    <a href={`/employee/goals/${g.id}`} className="text-ink/60 hover:underline">View</a>
                    <a href={`/supervisor/feedback/${g.id}`} className="text-accent hover:underline">Give feedback</a>
                    {g.cycle.status === 'REVIEW' ? (
                      <a href={`/supervisor/review/l1/${g.id}`} className="text-accent hover:underline">L1 review</a>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
