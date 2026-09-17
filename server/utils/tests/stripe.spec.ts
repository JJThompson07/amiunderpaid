import { describe, expect, it } from 'vitest';
import { isStripeSubscriptionMissingOrCanceled, isSubscriptionActive } from '../stripe';
import type Stripe from 'stripe';

describe('server/utils/stripe', () => {
  describe('isStripeSubscriptionMissingOrCanceled', () => {
    it('returns false for a falsy error', () => {
      expect(isStripeSubscriptionMissingOrCanceled(null)).toBe(false);
      expect(isStripeSubscriptionMissingOrCanceled(undefined)).toBe(false);
    });

    it('returns true for a resource_missing error (nonexistent or already-cancelled subscription)', () => {
      expect(
        isStripeSubscriptionMissingOrCanceled({
          statusCode: 404,
          code: 'resource_missing',
          message: "No such subscription: 'sub_123'"
        })
      ).toBe(true);
    });

    it('returns true for a 404 statusCode even without a matching code', () => {
      expect(isStripeSubscriptionMissingOrCanceled({ statusCode: 404 })).toBe(true);
    });

    it('returns true for invalid_canceled_subscription_fields (update on an already-cancelled subscription)', () => {
      expect(
        isStripeSubscriptionMissingOrCanceled({
          statusCode: 400,
          code: 'invalid_canceled_subscription_fields',
          message: 'A canceled subscription can only update its cancellation_details and metadata.'
        })
      ).toBe(true);
    });

    it('returns false for an unrelated Stripe error (e.g. rate limit)', () => {
      expect(
        isStripeSubscriptionMissingOrCanceled({
          statusCode: 429,
          code: 'rate_limit',
          message: 'Too many requests'
        })
      ).toBe(false);
    });

    it('returns false for a generic unexpected error', () => {
      expect(isStripeSubscriptionMissingOrCanceled(new Error('network timeout'))).toBe(false);
    });
  });

  describe('isSubscriptionActive', () => {
    it('returns false for a null or undefined subscription', () => {
      expect(isSubscriptionActive(null)).toBe(false);
      expect(isSubscriptionActive(undefined)).toBe(false);
    });

    it('returns true for an active subscription', () => {
      expect(isSubscriptionActive({ status: 'active' } as Stripe.Subscription)).toBe(true);
    });

    it('returns true for a trialing subscription', () => {
      expect(isSubscriptionActive({ status: 'trialing' } as Stripe.Subscription)).toBe(true);
    });

    it('returns false for a canceled subscription', () => {
      expect(isSubscriptionActive({ status: 'canceled' } as Stripe.Subscription)).toBe(false);
    });

    it('returns false for an incomplete_expired subscription', () => {
      expect(isSubscriptionActive({ status: 'incomplete_expired' } as Stripe.Subscription)).toBe(
        false
      );
    });
  });
});
