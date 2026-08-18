'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';
import { computeAndPublishScores } from '@/lib/scoring';

function assertHR(role: string) {
  if (!hasFullAccess(role)) throw new Error('Not authorized');
}

export async function createCycle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');
  assertHR(user.role);

  const name = String(formData.get('name') ?? '').trim();
  const startDate = new Date(String(formData.get('startDate') ?? ''));
  const endDate = new Date(String(formData.get('endDate') ?? ''));
  const reviewDue = new Date(String(formData.get('reviewDue') ?? ''));
  if (!name || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(reviewDue.getTime())) {
    redirect('/hr/cycles?error=invalid_cycle');
  }

  const cycle = await prisma.appraisalCycle.create({
    data: { name, startDate, endDate, reviewDue, status: 'DRAFT' },
  });

  await logAction({ actorId: user.id, summary: `${user.name} created appraisal cycle "${name}"`, targetType: 'AppraisalCycle', targetId: cycle.id });

  revalidatePath('/hr/cycles');
  redirect('/hr/cycles?message=cycle_created');
}

const NEXT_STATUS: Record<string, string> = {
  DRAFT: 'ACTIVE',
  ACTIVE: 'REVIEW',
  REVIEW: 'CLOSED',
};

export async function advanceCycle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');
  assertHR(user.role);

  const cycleId = String(formData.get('cycleId') ?? '');
  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error('Cycle not found');

  const nextStatus = NEXT_STATUS[cycle.status];
  if (!nextStatus) redirect(`/hr/cycles/${cycleId}?error=already_closed`);

  await prisma.appraisalCycle.update({ where: { id: cycleId }, data: { status: nextStatus as any } });

  let publishedCount = 0;
  if (nextStatus === 'CLOSED') {
    publishedCount = await computeAndPublishScores(cycleId);
  }

  await logAction({
    actorId: user.id,
    summary: `${user.name} moved cycle "${cycle.name}" from ${cycle.status} to ${nextStatus}${nextStatus === 'CLOSED' ? ` (published ${publishedCount} score(s))` : ''}`,
    targetType: 'AppraisalCycle',
    targetId: cycleId,
  });

  revalidatePath(`/hr/cycles/${cycleId}`);
  revalidatePath('/hr/cycles');
  redirect(`/hr/cycles/${cycleId}?message=status_updated`);
}
