import { prisma } from './db';

type LogActionInput = {
  actorId: string | null;
  actorLabel?: string;
  summary: string;
  targetType?: string;
  targetId?: string;
};

// Best-effort side effect, same philosophy as email.ts — a logging failure
// must never break the real mutation it's recording. Call this right
// alongside the action's existing revalidatePath calls, after the mutation
// has already succeeded.
export async function logAction(input: LogActionInput): Promise<void> {
  try {
    await prisma.auditLog.create({ data: input });
  } catch (err) {
    console.error('logAction: failed to write audit log', input.summary, err);
  }
}
