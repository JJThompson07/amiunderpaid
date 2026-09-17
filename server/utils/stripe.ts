import type Stripe from 'stripe';

// Verified against this account's test-mode API on the pinned version
// (2026-03-25.dahlia): retrieve/cancel/update on a subscription that doesn't
// exist (or was already cancelled and is cancelled/retrieved again) surfaces
// as `resource_missing` / 404. Updating an already-cancelled subscription
// instead surfaces as a distinct `invalid_canceled_subscription_fields` / 400
// -- it does NOT come back as resource_missing, so it needs its own check.
// Message-text matching was tried and dropped: the real update() message ("A
// canceled subscription can only update its cancellation_details and
// metadata.") doesn't contain phrases like "already canceled", so regexing
// for guessed strings silently misses this case -- match on `code` only.
export function isStripeSubscriptionMissingOrCanceled(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const statusCode = (error as { statusCode?: number }).statusCode;
  const code = (error as { code?: string }).code;

  return (
    statusCode === 404 ||
    code === 'resource_missing' ||
    code === 'invalid_canceled_subscription_fields'
  );
}

export function isSubscriptionActive(sub: Stripe.Subscription | null | undefined): boolean {
  if (!sub) {
    return false;
  }
  return sub.status === 'active' || sub.status === 'trialing';
}
