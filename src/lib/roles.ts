import type { Role, User } from '@prisma/client';

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  HR: 'HR',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Employee',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

// HR gets org-wide READ visibility into cycles/goals/reviews/scores, same as
// Super Admin — but user/role management and cycle deletion stay gated
// behind a separate assertSuperAdmin() check, never folded in here.
export function hasFullAccess(role: string): boolean {
  return role === 'HR' || role === 'SUPER_ADMIN';
}

export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN';
}

// There is no distinct "Manager"/L2 role — L2-reviewer authority is derived
// purely from the org hierarchy: any Supervisor automatically becomes the
// L2 reviewer for a Review the moment its L1 reviewer reports to them.
// Super Admin is the fallback L2 reviewer whenever the L1 reviewer has no
// manager at all (e.g. a top-of-chart Supervisor with nobody above them).
export function isL2ReviewerOf(user: Pick<User, 'id' | 'role'>, l1Reviewer: Pick<User, 'managerId'>): boolean {
  if (l1Reviewer.managerId === user.id) return true;
  return l1Reviewer.managerId === null && user.role === 'SUPER_ADMIN';
}
