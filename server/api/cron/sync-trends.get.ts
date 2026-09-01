import { timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { runIndustryTrendsSync } from '../../utils/industryTrendsSync';
import type { SyncSummary } from '../../utils/industryTrendsSync';

const ALERT_EMAIL_TO = 'support@amiunderpaid.com';
const ALERT_EMAIL_FROM = 'alerts@amiunderpaid.com';

const formatSalary = (country: string, average: number): string =>
  `${country === 'us' ? '$' : '£'}${Math.round(average).toLocaleString()}`;

// Plain !== short-circuits at the first mismatched byte, which (in
// principle) leaks how many leading characters of CRON_SECRET a guess got
// right via response-time differences -- this is a publicly reachable
// endpoint, so compare in constant time the same way verifySearchToken()
// does in server/utils/searchToken.ts.
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

// Emails a summary on every run (success or failure), not just on failure --
// this is the only unattended (no human watching) run of this sync (the
// other caller, the admin-triggered endpoint, shows its response directly to
// whoever clicked it), so a missing email is itself a signal that the cron
// didn't run at all, rather than looking identical to a quiet successful
// month.
const sendSyncSummaryEmail = async (
  resendApiKey: string | undefined,
  summary: SyncSummary
): Promise<void> => {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; industry-trends sync summary was not emailed.');
    return;
  }

  const successes = summary.results.filter((r) => r.status === 'ok');
  const failures = summary.results.filter((r) => r.status === 'error');

  const subject =
    failures.length > 0
      ? `⚠️ Industry trends sync: ${failures.length} failed, ${summary.synced} synced`
      : `Industry trends sync: ${summary.synced} synced, 0 failed`;

  const newDataLines = successes
    .filter((r) => r.latestMonth && r.latestAverage !== undefined)
    .map(
      (r) =>
        `- ${r.label} (${r.country}): ${formatSalary(r.country, r.latestAverage!)} for ${r.latestMonth}`
    );

  const failureLines = failures.map((r) => `- ${r.label} (${r.country}): ${r.error}`);

  const text = [
    `Monthly industry-trends sync completed.`,
    `Synced: ${summary.synced}`,
    `Failed: ${summary.failed}`,
    ...(newDataLines.length > 0 ? ['', 'New data:', ...newDataLines] : []),
    ...(failureLines.length > 0 ? ['', 'Failures:', ...failureLines] : [])
  ].join('\n');

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({ from: ALERT_EMAIL_FROM, to: ALERT_EMAIL_TO, subject, text });
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send industry-trends sync summary email', emailError);
  }
};

const sendSyncCrashEmail = async (
  resendApiKey: string | undefined,
  error: unknown
): Promise<void> => {
  if (!resendApiKey) {
    // eslint-disable-next-line no-console
    console.error('🚨 No RESEND_API_KEY configured; industry-trends sync crash was not emailed.');
    return;
  }

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: ALERT_EMAIL_FROM,
      to: ALERT_EMAIL_TO,
      subject: '🚨 Industry trends sync crashed',
      text: `The monthly industry-trends sync did not complete.\n\nError: ${error instanceof Error ? error.message : String(error)}`
    });
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send industry-trends sync crash email', emailError);
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
    throw createError({ statusCode: 500, statusMessage: 'Cron sync is misconfigured.' });
  }

  const authHeader = getHeader(event, 'authorization');
  if (!isAuthorized(authHeader, `Bearer ${expected}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    // Monthly delta here, never a 12-month backfill -- the one-time historical
    // backfill is a manual admin action via sync-trends.post.ts. Requesting
    // months=1 from Adzuna's /history endpoint returns an empty {} every time
    // (confirmed live against the real API) -- months=2 is the smallest value
    // that actually returns data, so we ask for 2 and let syncOne's existing
    // merge-by-month-key logic de-dupe the overlap with what's already stored.
    const summary = await runIndustryTrendsSync(2);

    if (summary.failed > 0) {
      // This is the only record of a sync failure that the response body
      // would otherwise silently carry -- Vercel Cron only checks the HTTP
      // status (always 200 here) for its own success/failure indicator, so a
      // run where every category fails would still show as "successful"
      // there without this.
      // eslint-disable-next-line no-console
      console.error(
        `🚨 Industry trends sync had ${summary.failed} failure(s)`,
        summary.results.filter((r) => r.status === 'error')
      );
    }

    await sendSyncSummaryEmail(config.resendApiKey, summary);

    return summary;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('🚨 Industry trends sync crashed before completing', error);
    await sendSyncCrashEmail(config.resendApiKey, error);
    throw error;
  }
});
