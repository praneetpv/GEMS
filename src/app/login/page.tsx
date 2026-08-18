const ERROR_MESSAGES: Record<string, string> = {
  sso_failed: 'Sign-in failed. Please try again.',
  sso_not_configured: 'Single sign-on is not configured for this deployment yet.',
  sso_no_code: 'Sign-in did not complete. Please try again.',
  sso_state_mismatch: 'Your sign-in session expired. Please try again.',
  not_provisioned: "We couldn't find an account for you. Please ask your Admin to add you.",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string; detail?: string } }) {
  const error = searchParams.error ? ERROR_MESSAGES[searchParams.error] ?? 'Something went wrong.' : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-xl font-serif font-semibold text-ink mb-2">Dbiz Employee Appraisal</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in with your Dbiz Microsoft account.</p>
        {error ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
            {error}
            {searchParams.detail ? <span className="block text-xs mt-1 text-red-500">{searchParams.detail}</span> : null}
          </p>
        ) : null}
        <a
          href="/api/auth/entra/login"
          className="block w-full rounded-lg bg-accent hover:bg-accent-hover text-white font-medium py-2.5 transition-colors"
        >
          Sign in with Microsoft
        </a>
        {process.env.NODE_ENV !== 'production' ? (
          <a href="/dev-login" className="block text-xs text-ink/40 hover:underline mt-4">
            Dev login (local only)
          </a>
        ) : null}
      </div>
    </main>
  );
}
