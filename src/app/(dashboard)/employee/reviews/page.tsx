import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const reviews = await prisma.review.findMany({
    where: { status: 'SUBMITTED', goal: { ownerId: user.id } },
    orderBy: [{ goalId: 'asc' }, { level: 'asc' }],
    include: { goal: true, reviewer: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">My Reviews</h1>
      {reviews.length === 0 ? <p className="text-sm text-ink/50">No reviews have been submitted yet.</p> : null}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.goal.title}</p>
              <span className="text-xs uppercase tracking-wide text-ink/50">{r.level} review</span>
            </div>
            {r.rating != null ? <p className="text-sm mt-1">Rating: <strong>{r.rating}</strong></p> : null}
            {r.comment ? <p className="text-sm text-ink/70 mt-1">{r.comment}</p> : null}
            <p className="text-xs text-ink/40 mt-1">
              {r.reviewer?.name ?? 'Reviewer'} &middot; {r.submittedAt?.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
