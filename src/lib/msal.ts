import { ConfidentialClientApplication } from '@azure/msal-node';

// Sign-in only (no Graph calls beyond the ID token), so the minimal default
// delegated scope is enough — matches Microsoft's own MSAL Node samples.
export const ENTRA_SCOPES = ['User.Read'];

export function isEntraConfigured(): boolean {
  return Boolean(
    process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_TENANT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.AZURE_AD_REDIRECT_URI,
  );
}

export function getEntraRedirectUri(): string {
  return process.env.AZURE_AD_REDIRECT_URI ?? '';
}

// The app's own public origin, derived from AZURE_AD_REDIRECT_URI rather
// than the incoming request — behind Railway's custom-domain proxying,
// request.url can reflect an internal/localhost origin instead of the real
// public one, which would send post-login redirects nowhere useful.
export function getAppBaseUrl(): string {
  const redirectUri = getEntraRedirectUri();
  return redirectUri ? new URL(redirectUri).origin : '';
}

// Constructed lazily (not at module load) so a deployment without Entra env
// vars configured never throws just by importing this file.
let cca: ConfidentialClientApplication | null = null;

export function getMsalClient(): ConfidentialClientApplication {
  if (!isEntraConfigured()) {
    throw new Error('Entra ID SSO is not configured for this deployment.');
  }
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      },
    });
  }
  return cca;
}
