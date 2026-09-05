import { describe, expect, it } from 'vitest';
import { computeTerritoryFulfillment } from '../territoryFulfillment';
import type { TerritoryClaim } from '~~/shared/utils/types';

describe('server/utils/territoryFulfillment', () => {
  describe('computeTerritoryFulfillment', () => {
    it('adds a brand new territory and stages its claim doc write', () => {
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] }
      ];

      const result = computeTerritoryFulfillment([], purchasedItems, {}, 'user-1');

      expect(result.conflict).toBe(false);
      if (result.conflict) {
        return;
      }
      expect(result.updatedTerritories).toEqual(purchasedItems);
      expect(result.claimWrites).toHaveLength(1);
      expect(result.claimWrites[0]!.claimDocId).toBe('10_IT');
      expect(result.claimWrites[0]!.updates.basicOwners).toBeDefined();
      expect(result.claimWrites[0]!.updates.takenExclusiveMonths).toBeUndefined();
    });

    it('merges exclusive months onto an existing territory instead of duplicating it', () => {
      const existingTerritories: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: true, exclusiveMonths: ['2026-01'] }
      ];
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2026-02'] }
      ];

      const result = computeTerritoryFulfillment(existingTerritories, purchasedItems, {}, 'user-1');

      expect(result.conflict).toBe(false);
      if (result.conflict) {
        return;
      }
      expect(result.updatedTerritories).toHaveLength(1);
      expect(result.updatedTerritories[0]!.exclusiveMonths.sort()).toEqual(['2026-01', '2026-02']);
      expect(result.updatedTerritories[0]!.isBasic).toBe(true);
    });

    it('reports a conflict when an exclusive month is already taken by a different user', () => {
      const claimDocsData = {
        '10_IT': { takenExclusiveMonths: { '2026-02': 'other-user' } }
      };
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2026-02'] }
      ];

      const result = computeTerritoryFulfillment([], purchasedItems, claimDocsData, 'user-1');

      expect(result.conflict).toBe(true);
      if (!result.conflict) {
        return;
      }
      expect(result.error.message).toBe('Territory 10_IT is already taken for month 2026-02');
    });

    it('allows re-claiming an exclusive month already held by the same user', () => {
      const claimDocsData = {
        '10_IT': { takenExclusiveMonths: { '2026-02': 'user-1' } }
      };
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2026-02'] }
      ];

      const result = computeTerritoryFulfillment([], purchasedItems, claimDocsData, 'user-1');

      expect(result.conflict).toBe(false);
    });

    it('stops before staging writes for items after the conflicting one', () => {
      const claimDocsData = {
        '20_IT': { takenExclusiveMonths: { '2026-03': 'other-user' } }
      };
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: true, exclusiveMonths: [] },
        { territoryId: 20, categoryValue: 'IT', isBasic: false, exclusiveMonths: ['2026-03'] }
      ];

      const result = computeTerritoryFulfillment([], purchasedItems, claimDocsData, 'user-1');

      expect(result.conflict).toBe(true);
    });

    it('produces no claim write for a territory purchased with neither basic nor exclusive months', () => {
      const purchasedItems: TerritoryClaim[] = [
        { territoryId: 10, categoryValue: 'IT', isBasic: false, exclusiveMonths: [] }
      ];

      const result = computeTerritoryFulfillment([], purchasedItems, {}, 'user-1');

      expect(result.conflict).toBe(false);
      if (result.conflict) {
        return;
      }
      expect(result.claimWrites).toHaveLength(0);
    });
  });
});
