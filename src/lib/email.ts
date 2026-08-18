import { ConfidentialClientApplication } from '@azure/msal-node';

// Deliberately its own ConfidentialClientApplication instance, separate from
// src/lib/msal.ts — that one's isEntraConfigured() also requires a redirect
// URI (for the interactive sign-in flow), which is irrelevant to this
// app-only, client-credentials flow used for sending mail as a mailbox.
export function isMailConfigured(): boolean {
  return Boolean(
    process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_TENANT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.MAIL_SENDER_ADDRESS,
  );
}

let cca: ConfidentialClientApplication | null = null;

function getMailClient(): ConfidentialClientApplication {
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

async function getGraphAppToken(): Promise<string> {
  const result = await getMailClient().acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  if (!result?.accessToken) throw new Error('No access token returned for Graph client-credentials flow.');
  return result.accessToken;
}

// Isolated so a missing/bad config or a Graph error degrades to "email not
// sent" — the caller's primary action (setting a goal, submitting a review,
// etc.) must never fail just because a notification email couldn't go out.
// Never throws.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!isMailConfigured()) {
    console.error('sendEmail: mail is not configured for this deployment (missing env vars).');
    return false;
  }

  try {
    const token = await getGraphAppToken();
    const sender = process.env.MAIL_SENDER_ADDRESS!;
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: 'true',
      }),
    });

    if (!response.ok) {
      console.error('sendEmail: Graph sendMail failed', response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEmail: failed to send', err);
    return false;
  }
}

function wrap(bodyHtml: string): string {
  return `<div style="font-family:sans-serif;color:#111;max-width:560px;margin:0 auto;">
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#888;">Dbiz Employee Appraisal</p>
  </div>`;
}

export function goalAssignedEmail(goalTitle: string, setByName: string): string {
  return wrap(`<p>A new goal was set for you by <strong>${setByName}</strong>:</p><p><strong>${goalTitle}</strong></p>`);
}

export function feedbackGivenEmail(goalTitle: string, authorName: string, comment: string): string {
  return wrap(
    `<p><strong>${authorName}</strong> left feedback on your goal <strong>${goalTitle}</strong>:</p><p>"${comment}"</p>`,
  );
}

export function reviewDueEmail(goalTitle: string, employeeName: string): string {
  return wrap(`<p>A review is due for <strong>${employeeName}</strong>'s goal <strong>${goalTitle}</strong>.</p>`);
}

export function scorePublishedEmail(cycleName: string, rating: string): string {
  return wrap(`<p>Your appraisal score for <strong>${cycleName}</strong> is ready: <strong>${rating}</strong>.</p>`);
}
