/**
 * Email notification for contact form submissions.
 *
 * Uses the Resend HTTP API — no package dependency, just a fetch call.
 * When RESEND_API_KEY is absent this returns false and the caller falls
 * back to the webhook or the 503 response.
 */

const RESEND_API = 'https://api.resend.com/emails';

export type EmailPayload = {
  name: string;
  email: string;
  organisation: string;
  message: string;
  requestType: string;
  selectedItems: string[];
  preferredChannels: string[];
  budgetBand: string | null;
  timeline: string;
  sourceInput: string | null;
  entryRoute: string;
  receivedAt: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendContactNotification(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const to = process.env.CONTACT_NOTIFY_EMAIL || 'knouxio@zohomail.com';
  const from = process.env.CONTACT_FROM_EMAIL || 'KNOuX Contact <onboarding@resend.dev>';

  const lines: string[] = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.organisation ? `Organisation: ${payload.organisation}` : '',
    `Request type: ${payload.requestType}`,
    payload.selectedItems.length ? `Items: ${payload.selectedItems.join(', ')}` : '',
    payload.preferredChannels.length ? `Preferred channels: ${payload.preferredChannels.join(', ')}` : '',
    payload.budgetBand ? `Budget: ${payload.budgetBand}` : '',
    payload.timeline ? `Timeline: ${payload.timeline}` : '',
    payload.sourceInput ? `Source input: ${payload.sourceInput}` : '',
    `Entry route: ${payload.entryRoute}`,
    `Received: ${payload.receivedAt}`,
    '',
    'Message:',
    payload.message,
  ];

  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New ${payload.requestType} enquiry from ${payload.name}`,
        text: lines.join('\n'),
      }),
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
