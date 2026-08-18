'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isL2ReviewerOf } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';
import { sendEmail, scorePublishedEmail } from '@/lib/email';

export async function submitL2Review(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authorized');

  const reviewId = String(formData.get('reviewId') ?? '');
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { goal: { include: { owner: true } } } });
  if (!review || review.level !== 'L2') throw new Error('Review not found');

  const l1Review = await prisma.review.findUnique({ where: { goalId_level: { goalId: review.goalId, level: 'L1' } } });
  if (!l1Review || l1Review.status !== 'SUBMITTED' || !l1Review.reviewerId) throw new Error('L1 review is not submitted yet');

  const l1Reviewer = await prisma.user.findUnique({ where: { id: l1Review.reviewerId } });
  if (!l1Reviewer || !isL2ReviewerOf(user, l1Reviewer)) throw new Error('Not authorized');

  const ratingRaw = String(formData.get('rating') ?? '').trim();
  const rating = ratingRaw ? Number(ratingRaw) : null;
  const comment = String(formData.get('comment') ?? '').trim();
  if (!rating || rating < 1 || rating > 5) redirect(`/supervisor/review/l2/${reviewId}?error=invalid_rating`);

  await prisma.review.update({
    where: { id: reviewId },
    data: { reviewerId: user.id, rating, comment, status: 'SUBMITTED', submittedAt: new Date() },
  });

  await logAction({
    actorId: user.id,
    summary: `${user.name} submitted L2 review for ${review.goal.owner.name}'s goal "${review.goal.title}" (rating ${rating})`,
    targetType: 'Review',
    targetId: review.goalId,
  });

  await sendEmail({
    to: review.goal.owner.email,
    subject: 'Your goal review is complete',
    html: scorePublishedEmail(review.goal.title, String(rating)),
  });
  const l1ReviewerEmail = l1Reviewer.email;
  await sendEmail({
    to: l1ReviewerEmail,
    subject: 'L2 review submitted',
    html: `<p>L2 review for ${review.goal.owner.name}'s goal "${review.goal.title}" has been submitted (rating ${rating}).</p>`,
  });

  revalidatePath('/supervisor/team');
  redirect('/supervisor/team?message=l2_submitted');
}
