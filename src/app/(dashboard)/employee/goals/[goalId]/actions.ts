'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logAction } from '@/lib/audit-log';

export async function logGoalUpdate(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const goalId = String(formData.get('goalId') ?? '');
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.ownerId !== user.id) throw new Error('Not authorized');

  const note = String(formData.get('note') ?? '').trim();
  const progressRaw = String(formData.get('progressPct') ?? '').trim();
  const progressPct = progressRaw ? Math.max(0, Math.min(100, Number(progressRaw))) : null;
  if (!note) redirect(`/employee/goals/${goalId}?error=missing_note`);

  await prisma.goalUpdate.create({
    data: { goalId, authorId: user.id, note, progressPct },
  });

  await logAction({
    actorId: user.id,
    summary: `${user.name} logged a progress update on goal "${goal.title}"`,
    targetType: 'Goal',
    targetId: goal.id,
  });

  revalidatePath(`/employee/goals/${goalId}`);
  redirect(`/employee/goals/${goalId}?message=update_logged`);
}
