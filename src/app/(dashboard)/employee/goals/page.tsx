import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { createGoal } from './actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  goal_created: 'Goal created.',
};
const ERRORS: Record<string, string> = {
  missing_title: 'Please give the goal a title.',
  no_active_cycle: 'There is no active appraisal cycle to add a goal to yet.',
};

export default async function EmployeeGoalsPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const goals = await prisma.goal.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { cycle: true, setBy: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif font-semibold">My Goals</h1>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <form action={createGoal} className="bg-white rounded-2xl shadow-sm p-6 space-y-3 max-w-lg">
        <h2 className="font-medium">Add a goal</h2>
        <input
          name="title"
          placeholder="Goal title"
          required
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <textarea
          name="description"
          placeholder="Description (optional)"
          rows={3}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
          Add goal
        </button>
      </form>

      <div className="space-y-3">
        {goals.length === 0 ? <p className="text-sm text-ink/50">No goals yet.</p> : null}
        {goals.map((g) => (
          <a
            key={g.id}
            href={`/employee/goals/${g.id}`}
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{g.title}</p>
              <span className="text-xs text-ink/50">{g.cycle.name}</span>
            </div>
            <p className="text-xs text-ink/50 mt-1">Set by {g.setBy.name} &middot; {g.status}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
