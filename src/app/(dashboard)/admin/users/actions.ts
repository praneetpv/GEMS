'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { isSuperAdmin, roleLabel } from '@/lib/roles';
import { logAction } from '@/lib/audit-log';

const EDITABLE_ROLES = ['EMPLOYEE', 'SUPERVISOR', 'HR', 'SUPER_ADMIN'] as const;

export async function updateUserRole(formData: FormData) {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role)) throw new Error('Not authorized');

  const userId = String(formData.get('userId') ?? '');
  const roleInput = String(formData.get('role') ?? '');
  if (!userId || !(EDITABLE_ROLES as readonly string[]).includes(roleInput)) throw new Error('Invalid role');

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error('User not found');

  await prisma.user.update({ where: { id: userId }, data: { role: roleInput as (typeof EDITABLE_ROLES)[number] } });

  await logAction({
    actorId: caller.id,
    summary: `${caller.name} changed role of ${target.name} from ${roleLabel(target.role)} to ${roleLabel(roleInput)}`,
    targetType: 'User',
    targetId: userId,
  });

  revalidatePath('/admin/users');
}
