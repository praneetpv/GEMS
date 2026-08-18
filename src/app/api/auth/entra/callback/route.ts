import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { getMsalClient, getEntraRedirectUri, getAppBaseUrl, ENTRA_SCOPES, isEntraConfigured } from '@/lib/msal';

const STATE_COOKIE = 'entra_state';

// Anyone on this domain is trusted Dbiz staff — auto-provisioned as an
// Employee on first sign-in. Admin/HR/Supervisor promotion happens via the
// Admin > Users page or the one-time roster import, not at login time.
const AUTO_PROVISION_DOMAIN = '@dbizsolution.com';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  // Never request.url — behind Railway's custom-domain proxying, the server
  // sees an internal origin, not the public one. getAppBaseUrl() is derived
  // from the already-configured AZURE_AD_REDIRECT_URI instead.
  const baseUrl = getAppBaseUrl();

  const expectedState = cookies().get(STATE_COOKIE)?.value;
  cookies().set(STATE_COOKIE, '', { path: '/', expires: new Date(0) });

  if (!isEntraConfigured()) {
    return NextResponse.redirect(`${baseUrl}/login?error=sso_not_configured`);
  }
  if (!code || !state) {
    const msError = url.searchParams.get('error');
    const msErrorDescription = url.searchParams.get('error_description');
    console.error('Entra callback missing code/state. Full query:', url.search);
    if (msError) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=sso_ms_error&detail=${encodeURIComponent(`${msError}: ${msErrorDescription ?? ''}`)}`,
      );
    }
    return NextResponse.redirect(`${baseUrl}/login?error=sso_no_code`);
  }
  if (!expectedState || state !== expectedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=sso_state_mismatch`);
  }

  try {
    const result = await getMsalClient().acquireTokenByCode({
      code,
      redirectUri: getEntraRedirectUri(),
      scopes: ENTRA_SCOPES,
    });

    const claims = (result?.idTokenClaims ?? {}) as {
      oid?: string;
      email?: string;
      preferred_username?: string;
      name?: string;
    };
    const oid = claims.oid;
    const email = (claims.email ?? claims.preferred_username ?? '').trim().toLowerCase();
    if (!oid) {
      return NextResponse.redirect(`${baseUrl}/login?error=sso_failed`);
    }

    let user = await prisma.user.findUnique({ where: { entraObjectId: oid } });

    if (!user && email) {
      const matchByEmail = await prisma.user.findUnique({ where: { email } });
      if (matchByEmail && !matchByEmail.entraObjectId) {
        user = await prisma.user.update({ where: { id: matchByEmail.id }, data: { entraObjectId: oid } });
      }
    }

    if (!user && email.endsWith(AUTO_PROVISION_DOMAIN)) {
      const localPart = email.slice(0, email.indexOf('@'));
      // Employee numbers are the stable business key elsewhere in this
      // schema (roster imports upsert by employeeNo); an auto-provisioned
      // SSO-only account has no roster row yet, so it gets a synthetic one
      // derived from their oid rather than left null.
      user = await prisma.user.create({
        data: {
          email,
          employeeNo: `SSO-${oid.slice(0, 12)}`,
          name: claims.name?.trim() || localPart,
          role: 'EMPLOYEE',
          entraObjectId: oid,
        },
      });
    }

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login?error=not_provisioned`);
    }

    setSessionCookie(user.id);
    return NextResponse.redirect(`${baseUrl}/`);
  } catch (err) {
    console.error('Entra ID SSO callback failed:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=sso_failed`);
  }
}
