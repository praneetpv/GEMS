'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';

// Local-testing-only shortcut so the golden path can be walked before an
// Azure AD App Registration exists for this project. `next build`/`next
// start` (what Railway actually runs) set NODE_ENV=production, so this is
// physically inert in any real deployment, not just hidden from the UI.
export async function devLoginAs(formData: FormData) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev login is not available in production.');
  }

  const userId = String(formData.get('userId') ?? '');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  setSessionCookie(user.id);
  redirect('/');
}
