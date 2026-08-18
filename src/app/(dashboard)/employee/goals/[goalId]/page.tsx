import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';
import { logGoalUpdate } from './actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { update_logged: 'Progress update logged.' };
const ERRORS: Record<string, string> = { missing_note: 'Please add a note before logging an update.' };

export default async function GoalDetailPage({
  params,
  searchParams,
}: {
  params: { goalId: string };
  searchParams: { message?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const goal = await prisma.goal.findUnique({
    where: { id: params.goalId },
    include: {
      owner: true,
      setBy: true,
      updates: { orderBy: { createdAt: 'desc' }, include: { author: true } },
      feedback: { orderBy: { createdAt: 'desc' }, include: { author: true } },
    },
  });
  if (!goal) notFound();

  const canView =
    goal.ownerId === user.id ||
    goal.owner.managerId === user.id ||
    hasFullAccess(user.role);
  if (!canView) redirect('/employee/goals');

  const canLogUpdate = goal.ownerId === user.id;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/employee/goals" className="text-xs text-ink/50 hover:underline">&larr; My Goals</a>
        <h1 className="text-2xl font-serif font-semibold mt-1">{goal.title}</h1>
        <p className="text-sm text-ink/60 mt-1">{goal.description}</p>
        <p className="text-xs text-ink/40 mt-1">Owner: {goal.owner.name} &middot; Set by {goal.setBy.name} &middot; {goal.status}</p>
      </div>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      {canLogUpdate ? (
        <form action={logGoalUpdate} className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <input type="hidden" name="goalId" value={goal.id} />
          <h2 className="font-medium">Log a progress update</h2>
          <textarea name="note" placeholder="What did you get done?" required rows={2} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <input name="progressPct" type="number" min={0} max={100} placeholder="Progress % (optional)" className="w-40 rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
            Log update
          </button>
        </form>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium">Progress log</h2>
        {goal.updates.length === 0 ? <p className="text-sm text-ink/50">No updates logged yet.</p> : null}
        {goal.updates.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm">{u.note}</p>
            <p className="text-xs text-ink/40 mt-1">
              {u.author.name} &middot; {u.createdAt.toLocaleDateString()}
              {u.progressPct != null ? ` · ${u.progressPct}%` : ''}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Feedback</h2>
        {goal.feedback.length === 0 ? <p className="text-sm text-ink/50">No feedback yet.</p> : null}
        {goal.feedback.map((f) => (
          <div key={f.id} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm">{f.comment}</p>
            <p className="text-xs text-ink/40 mt-1">{f.author.name} &middot; {f.createdAt.toLocaleDateString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
