import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getMsalClient, getEntraRedirectUri, ENTRA_SCOPES, isEntraConfigured } from '@/lib/msal';

const STATE_COOKIE = 'entra_state';

export async function GET(request: Request) {
  if (!isEntraConfigured()) {
    return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));
  }

  const state = randomUUID();
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  });

  const authUrl = await getMsalClient().getAuthCodeUrl({
    scopes: ENTRA_SCOPES,
    redirectUri: getEntraRedirectUri(),
    state,
  });

  return NextResponse.redirect(authUrl);
}
