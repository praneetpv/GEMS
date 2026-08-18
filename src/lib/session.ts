import { cookies } from 'next/headers';
import { prisma } from './db';

// Renamed from GlowUp's `dbiz_uid` to avoid any cross-app cookie confusion —
// both apps sit under the same dbizsolution.com org domain.
const COOKIE_NAME = 'dbiz_appraisal_uid';

export async function getCurrentUser() {
  const uid = cookies().get(COOKIE_NAME)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

// Must be called from within a Server Action or Route Handler.
export function setSessionCookie(userId: string) {
  cookies().set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', { path: '/', expires: new Date(0) });
}
