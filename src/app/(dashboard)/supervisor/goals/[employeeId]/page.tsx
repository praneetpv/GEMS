import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { createGoalForReport } from './actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { goal_created: 'Goal created.' };
const ERRORS: Record<string, string> = {
  missing_title: 'Please give the goal a title.',
  no_active_cycle: 'There is no active appraisal cycle to add a goal to yet.',
};

export default async function SupervisorGoalsForReportPage({
  params,
  searchParams,
}: {
  params: { employeeId: string };
  searchParams: { message?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const employee = await prisma.user.findUnique({ where: { id: params.employeeId } });
  if (!employee) notFound();
  if (employee.managerId !== user.id && !isSuperAdmin(user.role)) redirect('/supervisor/team');

  const goals = await prisma.goal.findMany({
    where: { ownerId: employee.id },
    orderBy: { createdAt: 'desc' },
    include: { cycle: true },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <a href="/supervisor/team" className="text-xs text-ink/50 hover:underline">&larr; My Team</a>
      <h1 className="text-2xl font-serif font-semibold">Goals for {employee.name}</h1>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <form action={createGoalForReport} className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="font-medium">Set a goal</h2>
        <input name="title" placeholder="Goal title" required className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <textarea name="description" placeholder="Description (optional)" rows={3} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
          Set goal
        </button>
      </form>

      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{g.title}</p>
              <p className="text-xs text-ink/40">{g.cycle.name} &middot; {g.status}</p>
            </div>
            <a href={`/employee/goals/${g.id}`} className="text-xs text-accent hover:underline">View</a>
          </div>
        ))}
      </div>
    </div>
  );
}
