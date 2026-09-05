import { Resend } from 'resend';

const ALERT_EMAIL_TO = 'support@amiunderpaid.com';
const ALERT_EMAIL_FROM = 'alerts@amiunderpaid.com';

// Emails ops when an automated refund/reversal following a fulfilment
// conflict does not succeed -- the customer was charged and needs a manual
// refund. Shared by the Stripe webhook (Checkout path) and the
// existing-subscription checkout path, which hit the same risk class via
// different Stripe object shapes (a Checkout Session vs. a subscription +
// invoice), so this only needs a human-readable reference string rather than
// either concrete Stripe type.
export async function sendBillingFailureAlert(
  resendApiKey: string | undefined,
  reference: string,
  reason: string,
  refundError: unknown
): Promise<void> {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; refund failure was not escalated beyond logs.');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: `Stripe territory conflict refund failed - ${reference}`,
      text: [
        `A Stripe billing operation hit a territory conflict and the automated refund/reversal did not succeed.`,
        `Reference: ${reference}`,
        `Reason: ${reason}`,
        `Refund error: ${refundError instanceof Error ? refundError.message : String(refundError)}`,
        `This customer was charged and needs a manual refund.`
      ].join('\n')
    });
  } catch (alertError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send refund failure alert email', alertError);
  }
}
