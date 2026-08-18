import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';
import { advanceCycle } from '../actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { status_updated: 'Cycle status updated.' };
const ERRORS: Record<string, string> = { already_closed: 'This cycle is already closed.' };
const NEXT_ACTION_LABEL: Record<string, string> = {
  DRAFT: 'Activate cycle (open goal-setting)',
  ACTIVE: 'Move to review (lock goals, start L1/L2 reviews)',
  REVIEW: 'Close cycle & publish scores',
};

export default async function CycleDetailPage({
  params,
  searchParams,
}: {
  params: { cycleId: string };
  searchParams: { message?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasFullAccess(user.role)) redirect('/employee/goals');

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: params.cycleId } });
  if (!cycle) notFound();

  const goals = await prisma.goal.findMany({ where: { cycleId: cycle.id }, include: { reviews: true } });
  const goalsWithL1 = goals.filter((g) => g.reviews.some((r) => r.level === 'L1' && r.status === 'SUBMITTED')).length;
  const goalsWithL2 = goals.filter((g) => g.reviews.some((r) => r.level === 'L2' && r.status === 'SUBMITTED')).length;
  const scoresPublished = await prisma.appraisalScore.count({ where: { cycleId: cycle.id, publishedAt: { not: null } } });

  const nextLabel = NEXT_ACTION_LABEL[cycle.status];

  return (
    <div className="space-y-6 max-w-2xl">
      <a href="/hr/cycles" className="text-xs text-ink/50 hover:underline">&larr; Appraisal Cycles</a>
      <h1 className="text-2xl font-serif font-semibold">{cycle.name}</h1>
      <p className="text-sm text-ink/60">Status: <strong>{cycle.status}</strong></p>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-ink/50">Goals set</p>
          <p className="text-2xl font-serif font-semibold">{goals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-ink/50">L1 reviews submitted</p>
          <p className="text-2xl font-serif font-semibold">{goalsWithL1} / {goals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-ink/50">L2 reviews submitted</p>
          <p className="text-2xl font-serif font-semibold">{goalsWithL2} / {goals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-ink/50">Scores published</p>
          <p className="text-2xl font-serif font-semibold">{scoresPublished}</p>
        </div>
      </div>

      {nextLabel ? (
        <form action={advanceCycle} className="bg-white rounded-2xl shadow-sm p-6">
          <input type="hidden" name="cycleId" value={cycle.id} />
          <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
            {nextLabel}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink/50">This cycle is closed. Scores are published.</p>
      )}
    </div>
  );
}
