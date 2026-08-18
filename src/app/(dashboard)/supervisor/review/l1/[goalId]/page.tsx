import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { submitL1Review } from './actions';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = { invalid_rating: 'Please give a rating between 1 and 5.' };

export default async function L1ReviewPage({
  params,
  searchParams,
}: {
  params: { goalId: string };
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const goal = await prisma.goal.findUnique({
    where: { id: params.goalId },
    include: {
      owner: true,
      updates: { orderBy: { createdAt: 'desc' }, include: { author: true } },
      reviews: true,
    },
  });
  if (!goal) notFound();
  if (goal.owner.managerId !== user.id && !isSuperAdmin(user.role)) redirect('/supervisor/team');

  const existing = goal.reviews.find((r) => r.level === 'L1');
  const alreadySubmitted = existing?.status === 'SUBMITTED';

  return (
    <div className="space-y-6 max-w-lg">
      <a href="/supervisor/team" className="text-xs text-ink/50 hover:underline">&larr; My Team</a>
      <h1 className="text-2xl font-serif font-semibold">L1 Review &middot; {goal.title}</h1>
      <p className="text-sm text-ink/60">{goal.owner.name}</p>

      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-medium text-sm">Progress log</h2>
        {goal.updates.length === 0 ? <p className="text-sm text-ink/50">No updates logged.</p> : null}
        {goal.updates.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm p-3 text-sm">
            {u.note} {u.progressPct != null ? <span className="text-ink/40">· {u.progressPct}%</span> : null}
          </div>
        ))}
      </section>

      {alreadySubmitted ? (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm">L1 review already submitted: rating <strong>{existing!.rating}</strong></p>
          {existing!.comment ? <p className="text-sm text-ink/70 mt-1">{existing!.comment}</p> : null}
        </div>
      ) : (
        <form action={submitL1Review} className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <input type="hidden" name="goalId" value={goal.id} />
          <h2 className="font-medium">Submit rating</h2>
          <input name="rating" type="number" min={1} max={5} required placeholder="Rating (1-5)" className="w-40 rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <textarea name="comment" placeholder="Comment" rows={3} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
            Submit L1 review
          </button>
        </form>
      )}
    </div>
  );
}
