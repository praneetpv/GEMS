'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';
import { sendEmail, reviewDueEmail } from '@/lib/email';

// The L1 reviewer's own manager becomes the L2 reviewer; if the L1 reviewer
// has no manager (top of the org chart), Super Admin is the fallback —
// mirrors isL2ReviewerOf() in src/lib/roles.ts.
async function resolveL2ReviewerId(l1ReviewerId: string): Promise<string | null> {
  const l1Reviewer = await prisma.user.findUnique({ where: { id: l1ReviewerId } });
  if (!l1Reviewer) return null;
  if (l1Reviewer.managerId) return l1Reviewer.managerId;
  const fallback = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', active: true } });
  return fallback?.id ?? null;
}

export async function submitL1Review(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const goalId = String(formData.get('goalId') ?? '');
  const goal = await prisma.goal.findUnique({ where: { id: goalId }, include: { owner: true } });
  if (!goal) throw new Error('Goal not found');
  if (goal.owner.managerId !== user.id && !isSuperAdmin(user.role)) throw new Error('Not authorized');

  const ratingRaw = String(formData.get('rating') ?? '').trim();
  const rating = ratingRaw ? Number(ratingRaw) : null;
  const comment = String(formData.get('comment') ?? '').trim();
  if (!rating || rating < 1 || rating > 5) redirect(`/supervisor/review/l1/${goalId}?error=invalid_rating`);

  await prisma.review.upsert({
    where: { goalId_level: { goalId, level: 'L1' } },
    create: { goalId, level: 'L1', reviewerId: user.id, rating, comment, status: 'SUBMITTED', submittedAt: new Date() },
    update: { reviewerId: user.id, rating, comment, status: 'SUBMITTED', submittedAt: new Date() },
  });

  const l2ReviewerId = await resolveL2ReviewerId(user.id);
  const existingL2 = await prisma.review.findUnique({ where: { goalId_level: { goalId, level: 'L2' } } });
  if (!existingL2) {
    await prisma.review.create({ data: { goalId, level: 'L2', reviewerId: l2ReviewerId, status: 'PENDING' } });
  } else if (existingL2.status === 'PENDING' && existingL2.reviewerId !== l2ReviewerId) {
    await prisma.review.update({ where: { id: existingL2.id }, data: { reviewerId: l2ReviewerId } });
  }

  await logAction({
    actorId: user.id,
    summary: `${user.name} submitted L1 review for ${goal.owner.name}'s goal "${goal.title}" (rating ${rating})`,
    targetType: 'Review',
    targetId: goalId,
  });

  if (l2ReviewerId) {
    const l2Reviewer = await prisma.user.findUnique({ where: { id: l2ReviewerId } });
    if (l2Reviewer) await sendEmail({ to: l2Reviewer.email, subject: 'L2 review needed', html: reviewDueEmail(goal.title, goal.owner.name) });
  }

  revalidatePath(`/supervisor/review/l1/${goalId}`);
  revalidatePath('/supervisor/team');
  redirect(`/supervisor/team?message=l1_submitted`);
}
