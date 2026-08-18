'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';
import { sendEmail, goalAssignedEmail } from '@/lib/email';

async function assertIsManagerOf(supervisorId: string, supervisorRole: string, employeeId: string) {
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error('Employee not found');
  if (employee.managerId !== supervisorId && !isSuperAdmin(supervisorRole)) throw new Error('Not authorized');
  return employee;
}

export async function createGoalForReport(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const employeeId = String(formData.get('employeeId') ?? '');
  const employee = await assertIsManagerOf(user.id, user.role, employeeId);

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!title) redirect(`/supervisor/goals/${employeeId}?error=missing_title`);

  const cycle = await prisma.appraisalCycle.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } });
  if (!cycle) redirect(`/supervisor/goals/${employeeId}?error=no_active_cycle`);

  const goal = await prisma.goal.create({
    data: {
      cycleId: cycle!.id,
      ownerId: employee.id,
      setById: user.id,
      title,
      description,
    },
  });

  await logAction({
    actorId: user.id,
    summary: `${user.name} set goal "${title}" for ${employee.name}`,
    targetType: 'Goal',
    targetId: goal.id,
  });

  await sendEmail({ to: employee.email, subject: 'New goal set', html: goalAssignedEmail(title, user.name) });

  revalidatePath(`/supervisor/goals/${employeeId}`);
  revalidatePath('/supervisor/team');
  redirect(`/supervisor/goals/${employeeId}?message=goal_created`);
}
