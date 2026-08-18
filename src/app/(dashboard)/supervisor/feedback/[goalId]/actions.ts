'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';
import { sendEmail, feedbackGivenEmail } from '@/lib/email';

export async function giveFeedback(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const goalId = String(formData.get('goalId') ?? '');
  const goal = await prisma.goal.findUnique({ where: { id: goalId }, include: { owner: true } });
  if (!goal) throw new Error('Goal not found');
  if (goal.owner.managerId !== user.id && !isSuperAdmin(user.role)) throw new Error('Not authorized');

  const comment = String(formData.get('comment') ?? '').trim();
  if (!comment) redirect(`/supervisor/feedback/${goalId}?error=missing_comment`);

  await prisma.feedback.create({
    data: { goalId, employeeId: goal.ownerId, authorId: user.id, comment },
  });

  await logAction({
    actorId: user.id,
    summary: `${user.name} gave feedback on ${goal.owner.name}'s goal "${goal.title}"`,
    targetType: 'Goal',
    targetId: goal.id,
  });

  await sendEmail({
    to: goal.owner.email,
    subject: 'New feedback on your goal',
    html: feedbackGivenEmail(goal.title, user.name, comment),
  });

  revalidatePath(`/supervisor/feedback/${goalId}`);
  revalidatePath(`/employee/goals/${goalId}`);
  redirect(`/supervisor/feedback/${goalId}?message=feedback_given`);
}
