import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { giveFeedback } from './actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { feedback_given: 'Feedback sent.' };
const ERRORS: Record<string, string> = { missing_comment: 'Please write a comment before submitting.' };

export default async function GiveFeedbackPage({
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
    include: { owner: true, feedback: { orderBy: { createdAt: 'desc' }, include: { author: true } } },
  });
  if (!goal) notFound();
  if (goal.owner.managerId !== user.id && !isSuperAdmin(user.role)) redirect('/supervisor/team');

  return (
    <div className="space-y-6 max-w-lg">
      <a href="/supervisor/team" className="text-xs text-ink/50 hover:underline">&larr; My Team</a>
      <h1 className="text-2xl font-serif font-semibold">Feedback &middot; {goal.title}</h1>
      <p className="text-sm text-ink/60">For {goal.owner.name}</p>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <form action={giveFeedback} className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        <input type="hidden" name="goalId" value={goal.id} />
        <textarea name="comment" placeholder="Give feedback on this goal" required rows={3} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
          Send feedback
        </button>
      </form>

      <div className="space-y-2">
        {goal.feedback.map((f) => (
          <div key={f.id} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm">{f.comment}</p>
            <p className="text-xs text-ink/40 mt-1">{f.author.name} &middot; {f.createdAt.toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
