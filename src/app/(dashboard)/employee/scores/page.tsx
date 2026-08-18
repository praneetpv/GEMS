import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MyScoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const scores = await prisma.appraisalScore.findMany({
    where: { employeeId: user.id, publishedAt: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: { cycle: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-semibold">My Scores</h1>
      {scores.length === 0 ? <p className="text-sm text-ink/50">No published scores yet.</p> : null}
      <div className="space-y-3">
        {scores.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{s.cycle.name}</p>
              <p className="text-xs text-ink/40">Published {s.publishedAt?.toLocaleDateString()}</p>
            </div>
            <p className="text-xl font-serif font-semibold">{s.overallRating?.toString() ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
