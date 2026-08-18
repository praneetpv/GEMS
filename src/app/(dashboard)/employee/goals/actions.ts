'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logAction } from '@/lib/audit-log';
import { sendEmail, goalAssignedEmail } from '@/lib/email';

export async function createGoal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) redirect('/employee/goals?error=missing_title');

  const cycle = await prisma.appraisalCycle.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } });
  if (!cycle) redirect('/employee/goals?error=no_active_cycle');

  const goal = await prisma.goal.create({
    data: {
      cycleId: cycle!.id,
      ownerId: user.id,
      setById: user.id,
      title,
      description,
    },
  });

  await logAction({
    actorId: user.id,
    summary: `${user.name} created goal "${title}" for themselves`,
    targetType: 'Goal',
    targetId: goal.id,
  });

  if (user.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: user.managerId } });
    if (manager) await sendEmail({ to: manager.email, subject: 'New goal set', html: goalAssignedEmail(title, user.name) });
  }

  revalidatePath('/employee/goals');
  redirect('/employee/goals?message=goal_created');
}
