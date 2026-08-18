import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { hasFullAccess } from '@/lib/roles';
import { createCycle } from './actions';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { cycle_created: 'Cycle created.' };
const ERRORS: Record<string, string> = { invalid_cycle: 'Please fill in a name and valid dates.' };

export default async function CyclesPage({ searchParams }: { searchParams: { message?: string; error?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasFullAccess(user.role)) redirect('/employee/goals');

  const cycles = await prisma.appraisalCycle.findMany({ orderBy: { startDate: 'desc' } });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif font-semibold">Appraisal Cycles</h1>

      {searchParams.message ? (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{MESSAGES[searchParams.message]}</p>
      ) : null}
      {searchParams.error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ERRORS[searchParams.error] ?? 'Something went wrong.'}</p>
      ) : null}

      <form action={createCycle} className="bg-white rounded-2xl shadow-sm p-6 space-y-3 max-w-lg">
        <h2 className="font-medium">Create a cycle</h2>
        <input name="name" placeholder="e.g. Annual Appraisal 2027" required className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        <div className="flex gap-3">
          <label className="flex-1 text-xs text-ink/50">
            Start date
            <input name="startDate" type="date" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-ink/50">
            End date
            <input name="endDate" type="date" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 text-xs text-ink/50">
            Review due
            <input name="reviewDue" type="date" required className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
          </label>
        </div>
        <button type="submit" className="rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2">
          Create cycle
        </button>
      </form>

      <div className="space-y-2">
        {cycles.map((c) => (
          <a key={c.id} href={`/hr/cycles/${c.id}`} className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <span className="text-xs uppercase tracking-wide text-ink/50">{c.status}</span>
            </div>
            <p className="text-xs text-ink/40 mt-1">
              {c.startDate.toLocaleDateString()} &ndash; {c.endDate.toLocaleDateString()} &middot; review due {c.reviewDue.toLocaleDateString()}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
