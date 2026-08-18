const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Fixed, obviously-fake employee numbers so these never collide with a real
// row from the one-time Excel import (scripts/import-employees.js). This
// runs on every `npm run start` (see package.json), so it must stay purely
// additive/idempotent — upsert only, never delete — same rule as the
// GlowUp LMS this project is a sibling to.
const DEMO_USERS = [
  { employeeNo: 'SEED-SUPERADMIN', name: 'System Admin', email: 'appraisal-admin@dbizsolution.com', role: 'SUPER_ADMIN', managerNo: null },
  { employeeNo: 'SEED-HR', name: 'HR Lead', email: 'appraisal-hr@dbizsolution.com', role: 'HR', managerNo: null },
  { employeeNo: 'SEED-VP', name: 'VP Engineering', email: 'appraisal-vp@dbizsolution.com', role: 'SUPERVISOR', managerNo: 'SEED-SUPERADMIN' },
  { employeeNo: 'SEED-MGR', name: 'Engineering Manager', email: 'appraisal-mgr@dbizsolution.com', role: 'SUPERVISOR', managerNo: 'SEED-VP' },
  { employeeNo: 'SEED-EMP1', name: 'Employee One', email: 'appraisal-emp1@dbizsolution.com', role: 'EMPLOYEE', managerNo: 'SEED-MGR' },
  { employeeNo: 'SEED-EMP2', name: 'Employee Two', email: 'appraisal-emp2@dbizsolution.com', role: 'EMPLOYEE', managerNo: 'SEED-MGR' },
];

async function seedUsers() {
  // Two-pass: create every row first (no manager), then resolve manager
  // links in a second pass — mirrors the two-pass logic import-employees.js
  // needs for real rosters, where a manager can appear after their reports.
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { employeeNo: u.employeeNo },
      create: { employeeNo: u.employeeNo, name: u.name, email: u.email, role: u.role },
      update: { name: u.name, email: u.email, role: u.role },
    });
  }
  for (const u of DEMO_USERS) {
    if (!u.managerNo) continue;
    const manager = await prisma.user.findUnique({ where: { employeeNo: u.managerNo } });
    if (!manager) continue;
    await prisma.user.update({ where: { employeeNo: u.employeeNo }, data: { managerId: manager.id } });
  }
}

async function seedCycle() {
  const existing = await prisma.appraisalCycle.findFirst({ where: { name: 'Annual Appraisal 2026' } });
  if (existing) return existing;

  return prisma.appraisalCycle.create({
    data: {
      name: 'Annual Appraisal 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      reviewDue: new Date('2027-01-15'),
      status: 'ACTIVE',
    },
  });
}

async function seedGoals(cycle) {
  const emp1 = await prisma.user.findUnique({ where: { employeeNo: 'SEED-EMP1' } });
  const emp2 = await prisma.user.findUnique({ where: { employeeNo: 'SEED-EMP2' } });
  const mgr = await prisma.user.findUnique({ where: { employeeNo: 'SEED-MGR' } });
  if (!emp1 || !emp2 || !mgr) return;

  const existing = await prisma.goal.findFirst({ where: { cycleId: cycle.id, ownerId: emp1.id } });
  if (existing) return;

  const goal1 = await prisma.goal.create({
    data: {
      cycleId: cycle.id,
      ownerId: emp1.id,
      setById: emp1.id,
      title: 'Ship the onboarding revamp',
      description: 'Redesign and ship the new-hire onboarding flow end to end.',
      weight: 60,
    },
  });
  await prisma.goalUpdate.create({
    data: { goalId: goal1.id, authorId: emp1.id, note: 'Kicked off discovery, drafted the new flow.', progressPct: 20 },
  });
  await prisma.feedback.create({
    data: { goalId: goal1.id, employeeId: emp1.id, authorId: mgr.id, comment: 'Good start — loop in design earlier next time.' },
  });

  const goal2 = await prisma.goal.create({
    data: {
      cycleId: cycle.id,
      ownerId: emp2.id,
      setById: mgr.id,
      title: 'Reduce support ticket backlog by 30%',
      description: 'Triage and close aged support tickets, improve first-response time.',
      weight: 40,
    },
  });
  await prisma.goalUpdate.create({
    data: { goalId: goal2.id, authorId: emp2.id, note: 'Backlog down 12% so far.', progressPct: 40 },
  });
}

async function main() {
  await seedUsers();
  const cycle = await seedCycle();
  await seedGoals(cycle);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
