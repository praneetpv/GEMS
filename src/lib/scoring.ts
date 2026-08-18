import { prisma } from './db';
import { sendEmail, scorePublishedEmail } from './email';

// Simple weighted average of each employee's SUBMITTED L2 ratings for the
// cycle (falls back to an unweighted average if no goal carries a weight).
// v1 can replace this with a stricter weighted formula — see the plan's
// "Goal.weight-based weighted scoring" v1 item.
export async function computeAndPublishScores(cycleId: string): Promise<number> {
  const goals = await prisma.goal.findMany({
    where: { cycleId },
    include: { reviews: { where: { level: 'L2', status: 'SUBMITTED' } } },
  });

  const byEmployee = new Map<string, { totalWeight: number; weightedSum: number; count: number }>();
  for (const goal of goals) {
    const l2 = goal.reviews[0];
    if (!l2 || l2.rating == null) continue;
    const weight = goal.weight ?? 1;
    const entry = byEmployee.get(goal.ownerId) ?? { totalWeight: 0, weightedSum: 0, count: 0 };
    entry.totalWeight += weight;
    entry.weightedSum += weight * l2.rating;
    entry.count += 1;
    byEmployee.set(goal.ownerId, entry);
  }

  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  let published = 0;

  for (const [employeeId, entry] of byEmployee) {
    if (entry.count === 0 || entry.totalWeight === 0) continue;
    const overallRating = entry.weightedSum / entry.totalWeight;

    const score = await prisma.appraisalScore.upsert({
      where: { cycleId_employeeId: { cycleId, employeeId } },
      create: { cycleId, employeeId, overallRating, publishedAt: new Date() },
      update: { overallRating, publishedAt: new Date() },
    });
    published += 1;

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (employee && cycle) {
      await sendEmail({
        to: employee.email,
        subject: 'Your appraisal score is ready',
        html: scorePublishedEmail(cycle.name, score.overallRating?.toFixed(2) ?? '—'),
      });
    }
  }

  return published;
}
