import { timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { purgeExpiredCache } from '../../utils/cachePurge';
import type { PurgeSummary } from '../../utils/cachePurge';

const ALERT_EMAIL_TO = 'support@amiunderpaid.com';
const ALERT_EMAIL_FROM = 'alerts@amiunderpaid.com';

// Plain !== short-circuits at the first mismatched byte, which (in
// principle) leaks how many leading characters of CRON_SECRET a guess got
// right via response-time differences -- this is a publicly reachable
// endpoint, so compare in constant time the same way sync-trends.get.ts does.
const isAuthorized = (received: string | undefined, expected: string): boolean => {
  if (!received) {
    return false;
  }
  const receivedBuf = Buffer.from(received);
  const expectedBuf = Buffer.from(expected);
  if (receivedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(receivedBuf, expectedBuf);
};

// Emails a summary on every run, not just on failure -- this is the only
// unattended (no human watching) run of this purge (the other caller, the
// admin-triggered endpoint, shows its response directly to whoever clicked
// it), so a missing email is itself a signal that the cron didn't run at
// all, rather than looking identical to a quiet successful night.
const sendPurgeSummaryEmail = async (
  resendApiKey: string | undefined,
  summary: PurgeSummary
): Promise<void> => {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; cache purge summary was not emailed.');
    return;
  }

  const text = [
    'Daily cache purge completed.',
    `Deleted jobs: ${summary.deletedJobs}`,
    `Deleted distributions: ${summary.deletedDistributions}`
  ].join('\n');

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: `Cache purge: ${summary.deletedJobs + summary.deletedDistributions} deleted`,
      text
    });
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send cache purge summary email', emailError);
  }
};

const sendPurgeCrashEmail = async (
  resendApiKey: string | undefined,
  error: unknown
): Promise<void> => {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; cache purge crash was not emailed.');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: '🚨 Cache purge crashed',
      text: `The daily cache purge did not complete.\n\nError: ${error instanceof Error ? error.message : String(error)}`
    });
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send cache purge crash email', emailError);
  }
};

// Triggered by Vercel Cron (see vercel.json), which always sends GET and
// carries no Firebase session -- so this route lives outside /api/admin/
// (exempt from admin-guard.ts's blanket verifyAdmin check) and authenticates
// via CRON_SECRET instead, matching Vercel's own documented pattern: Vercel
// automatically sends the CRON_SECRET env var value as `Authorization: Bearer
// <value>` when it invokes a cron job.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const expected = config.cronSecret;

  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'Cron purge is misconfigured.' });
  }

  const authHeader = getHeader(event, 'authorization');
  if (!isAuthorized(authHeader, `Bearer ${expected}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    const summary = await purgeExpiredCache();

    await sendPurgeSummaryEmail(config.resendApiKey, summary);

    return summary;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('🚨 Cache purge crashed before completing', error);
    await sendPurgeCrashEmail(config.resendApiKey, error);
    throw error;
  }
});
