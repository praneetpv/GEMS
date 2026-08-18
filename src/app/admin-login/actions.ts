'use server';

import { timingSafeEqual } from 'crypto';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';

// Single-account "break glass" login, separate from /dev-login's seeded-user
// picker. Requires a real password (constant-time compared, never stored --
// only ever read from SUPER_ADMIN_BOOTSTRAP_PASSWORD) and only ever signs in
// as the existing Super Admin account, never as anyone else. A bridge so
// HR/Admin can start setting up cycles/users on Railway before the real
// Azure AD App Registration is wired up -- unset the env var once real SSO
// is live and this route stops working entirely.
function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function bootstrapAdminLogin(formData: FormData) {
  const expected = process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD;
  if (!expected) {
    redirect('/admin-login?error=not_configured');
  }

  const password = String(formData.get('password') ?? '');
  if (!password || !passwordMatches(password, expected!)) {
    redirect('/admin-login?error=wrong_password');
  }

  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!superAdmin) {
    redirect('/admin-login?error=no_super_admin');
  }

  setSessionCookie(superAdmin!.id);
  redirect('/');
}