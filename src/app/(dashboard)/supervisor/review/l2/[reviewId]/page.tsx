import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isL2ReviewerOf } from '@/lib/roles';
import { submitL2Review } from './actions';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = { invalid_rating: 'Please give a rating between 1 and 5.' };

export default async function L2ReviewPage({
  params,
  searchParams,
}: {
  params: { reviewId: string };
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const review = await prisma.review.findUnique({
    where: { id: params.reviewId },
    include: { goal: { include: { owner: true, updates: { orderBy: { createdAt: 'desc' }, include: { author: true } } } } },
  });
  if (!review || review.level !== 'L2') notFound();

  const l1Review = await prisma.review.findUnique({ where: { goalId_level: { goalId: review.goalId, level: 'L1' } } });
  const l1Reviewer = l1Review?.reviewerId ? await prisma.user.findUnique({ where: { id: l1Review.reviewerId } }) : null;

  if (!l1Review || l1Review.status !== 'SUBMITTED' || !l1Reviewer) {
    redirect('/supervisor/team?error=l1_not_submitted');
  }
  if (!isL2ReviewerOf(user, l1Reviewer!)) redirect('/supervisor/team');

  const alreadySubmitted = review.status === 'SUBMITTED';

  return (
    <div className="space-y-6 max-w-lg">
      <a href="/supervisor/team" className="text-xs text-ink/50 hover:underline">&larr; My Team</a>
      <h1 className="text-2xl font-serif font-semibold">L2 Review &middot; {review.goal.title}</h1>
      <p className="text-sm text-ink/60">{review.goal.owner.name} &middot; L1 reviewer: {l1Reviewer!.name}</p>

      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <p className="text-sm font-medium">L1 rating: {l1Review!.rating}</p>
        {l1Review!.comment ? <p className="text-sm text-ink/70 mt-1">{l1Review!.comment}</p> : null}
      </div>

      <section className="space-y-2">
        <h2 className="font-medium text-sm">Progress log</h2>
        {review.goal.updates.length === 0 ? <p className="text-sm text-ink/50">No updates logged.</p> : null}
        {review.goal.updates.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm p-3 text-sm">
            {u.note} {u.progressPct != null ? <span className="text-ink/40">· {u.progressPct}%</span> : null}
          </div>
        ))}
      </section>

      {alreadySubmitted ? (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm">L2 review already submitted: rating <strong>{review.rating}</strong></p>
          {review.comment ? <p className="text-sm text-ink/70 mt-1">{review.comment}</p> : null}
        </div>
      ) : (
        <form action={submitL2Review} className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <input type="hidden" name="reviewId" value={review.id} />
          <h2 className="font-medium">Approve or adjust the rating</h2>
          <input
            name="rating"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={l1Review!.rating ?? undefined}
            placeholder="Final rating (1-5)"
            className="w-40 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <textarea name="comment" placeholder="Comment" rows={3} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
            Submit L2 review
          </button>
        </form>
      )}
    </div>
  );
}
