import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Initialize the test environment, loading the local rules file
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-amiunderpaid',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8')
    }
  });
});

beforeEach(async () => {
  // Clear the database before each test
  await testEnv.clearFirestore();
});

afterAll(async () => {
  // Clean up
  await testEnv.cleanup();
});

describe('Firestore Security Rules', () => {
  describe('Users Collection (/users/{userId})', () => {
    it('allows a user to read their own profile', async () => {
      const alice = testEnv.authenticatedContext('alice', { email: 'alice@example.com' });
      await assertSucceeds(alice.firestore().collection('users').doc('alice').get());
    });

    it('denies a user from reading another user profile', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertFails(alice.firestore().collection('users').doc('bob').get());
    });

    it('allows admins to read any profile', async () => {
      const admin = testEnv.authenticatedContext('admin', { admin: true });
      await assertSucceeds(admin.firestore().collection('users').doc('bob').get());
    });

    it('allows a user to update allowed fields on their profile', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertSucceeds(
        alice
          .firestore()
          .collection('users')
          .doc('alice')
          .set({ name: 'Alice', agency_name: 'Agency' })
      );
    });

    it('denies a user from setting protected fields (role, status)', async () => {
      const alice = testEnv.authenticatedContext('alice');
      await assertFails(
        alice.firestore().collection('users').doc('alice').set({ name: 'Alice', role: 'admin' })
      );

      // Seed an existing doc via unauthenticated admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('users')
          .doc('bob')
          .set({ name: 'Bob', status: 'active' });
      });

      const bob = testEnv.authenticatedContext('bob');
      await assertFails(
        bob.firestore().collection('users').doc('bob').update({ status: 'banned' })
      );
    });
  });

  describe('Server-Only Collections', () => {
    it('denies all client writes and reads to search_history', async () => {
      const alice = testEnv.authenticatedContext('alice');
      const admin = testEnv.authenticatedContext('admin', { admin: true });

      await assertFails(alice.firestore().collection('search_history').doc('1').get());
      await assertFails(admin.firestore().collection('search_history').doc('1').get());
      await assertFails(
        alice.firestore().collection('search_history').doc('1').set({ foo: 'bar' })
      );
    });

    it('denies all client writes and reads to mail', async () => {
      const alice = testEnv.authenticatedContext('alice');

      await assertFails(alice.firestore().collection('mail').doc('1').get());
      await assertFails(alice.firestore().collection('mail').doc('1').set({ to: 'x@x.com' }));
    });
  });

  describe('Leads Collection', () => {
    it('allows a recruiter to read leads assigned to them', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('leads')
          .doc('lead1')
          .set({ recruiterId: 'recruiter_uid' });
      });
      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      await assertSucceeds(recruiter.firestore().collection('leads').doc('lead1').get());
    });

    it('denies a recruiter from reading leads not assigned to them', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('leads')
          .doc('lead2')
          .set({ recruiterId: 'other_uid' });
      });
      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      await assertFails(recruiter.firestore().collection('leads').doc('lead2').get());
    });

    it('denies a recruiter from writing to leads (server-only)', async () => {
      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      await assertFails(
        recruiter.firestore().collection('leads').doc('lead3').set({ recruiterId: 'recruiter_uid' })
      );
    });
  });

  describe('Territory Category Owners Collection', () => {
    it('allows an authenticated user to read territory_category_owners', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('territory_category_owners')
          .doc('1_dev')
          .set({ territoryId: 1, categoryValue: 'dev', takenExclusiveMonths: {} });
      });

      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      await assertSucceeds(
        recruiter.firestore().collection('territory_category_owners').doc('1_dev').get()
      );
    });

    it('denies a client write to territory_category_owners (server-only)', async () => {
      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      await assertFails(
        recruiter
          .firestore()
          .collection('territory_category_owners')
          .doc('1_dev')
          .set({ territoryId: 1, categoryValue: 'dev', takenExclusiveMonths: {} })
      );
    });

    it('makes a lock written the way the webhook writes it visible to the useTerritoryClaims query shape', async () => {
      // Seeds a doc exactly as server/api/stripe/webhook.post.ts's fulfilment
      // transaction does: doc ID `${territoryId}_${categoryValue}`, written
      // via the Admin SDK (rules disabled, matching server-only write access).
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection('territory_category_owners')
          .doc('1_dev')
          .set({
            territoryId: 1,
            categoryValue: 'dev',
            takenExclusiveMonths: { '2026-09': 'other-recruiter-uid' }
          });
      });

      // Reads it back using the exact query shape useTerritoryClaims.ts builds
      // (collection + `territoryId in [...]`) — this is the round-trip that
      // originally broke when the reader and writer pointed at different
      // collections.
      const recruiter = testEnv.authenticatedContext('recruiter_uid');
      const snapshot = await recruiter
        .firestore()
        .collection('territory_category_owners')
        .where('territoryId', 'in', [1])
        .get();

      expect(snapshot.empty).toBe(false);
      const doc = snapshot.docs[0]!.data();
      expect(doc.takenExclusiveMonths['2026-09']).toBe('other-recruiter-uid');
    });
  });
});
