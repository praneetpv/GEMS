import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { roleLabel } from '@/lib/roles';
import { devLoginAs } from './actions';

export const dynamic = 'force-dynamic';

export default async function DevLoginPage() {
  if (process.env.NODE_ENV === 'production') redirect('/login');

  const users = await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-lg font-serif font-semibold text-ink mb-1">Dev Login</h1>
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          Local testing only — this page does not exist once deployed (NODE_ENV=production disables it).
        </p>
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-ink/50">No users found — run `npx prisma db seed` first.</p>
          ) : null}
          {users.map((u) => (
            <form key={u.id} action={devLoginAs}>
              <input type="hidden" name="userId" value={u.id} />
              <button
                type="submit"
                className="w-full text-left rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-paper transition-colors flex items-center justify-between"
              >
                <span>{u.name}</span>
                <span className="text-xs text-ink/40">{roleLabel(u.role)}</span>
              </button>
            </form>
          ))}
        </div>
        <a href="/login" className="block text-center text-xs text-ink/40 hover:underline mt-6">
          Use real sign-in instead
        </a>
      </div>
    </main>
  );
}
