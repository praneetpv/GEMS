import { bootstrapAdminLogin } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  wrong_password: 'Incorrect password.',
  not_configured: 'This bridge login is not enabled on this deployment.',
  no_super_admin: 'No Super Admin account exists yet — seed or import one first.',
};

export default function AdminBootstrapLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? 'Something went wrong.' : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-lg font-serif font-semibold text-ink mb-1">Super Admin Bridge Login</h1>
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          Temporary bridge until Entra SSO is wired up. Remove SUPER_ADMIN_BOOTSTRAP_PASSWORD once real sign-in is live.
        </p>
        {error ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p> : null}
        <form action={bootstrapAdminLogin} className="space-y-3">
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="block w-full rounded-lg bg-accent hover:bg-accent-hover text-white font-medium py-2.5 transition-colors"
          >
            Sign in
          </button>
        </form>
        <a href="/login" className="block text-xs text-ink/40 hover:underline mt-6">
          Back to normal sign-in
        </a>
      </div>
    </main>
  );
}