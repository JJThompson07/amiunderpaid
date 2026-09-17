import { describe, expect, it } from 'vitest';
import {
  ALL_SENIORITY_WORDS,
  calculateTitleRelevanceScore,
  extractSearchAnchorPhrase,
  filterAndRankJobsByRelevance,
  SCOPE_MODIFIERS,
  tokenize
} from '../searchRelevance';

describe('searchRelevance', () => {
  describe('calculateTitleRelevanceScore', () => {
    it('scores an exact title match as 1.0', () => {
      expect(calculateTitleRelevanceScore('Group Head of Finance', 'Group Head of Finance')).toBe(
        1
      );
    });

    it('scores partial overlap proportionally', () => {
      // search tokens (after stop-word strip): group, head, finance (3 tokens)
      // candidate "Head of Finance" tokens: head, finance -> overlap 2/3
      expect(calculateTitleRelevanceScore('Head of Finance', 'Group Head of Finance')).toBeCloseTo(
        2 / 3
      );
    });

    it('scores completely unrelated titles as 0', () => {
      expect(calculateTitleRelevanceScore('Sales Executive', 'Group Head of Finance')).toBe(0);
    });

    it('applies domain stemming so financial/finance and accounting/accountant match', () => {
      expect(calculateTitleRelevanceScore('Financial Director', 'Finance Director')).toBe(1);
      expect(calculateTitleRelevanceScore('Accountant', 'Accounting')).toBe(1);
    });

    it('does not score a plain "C" listing as a full match for a "C#" search', () => {
      // Regression guard: before tokenize retained # as a token character, "c#"
      // and "c" both collapsed to the same token and this scored 1.0.
      expect(calculateTitleRelevanceScore('C Developer', 'C# Developer')).toBeLessThan(1);
    });
  });

  describe('tokenize', () => {
    it('strips stop words and punctuation', () => {
      expect(tokenize('Head of Finance & Corporate Accounting')).toEqual([
        'head',
        'finance',
        'corporate',
        'accountant'
      ]);
    });

    it('retains # and + as token characters so C# and C++ do not collapse to C', () => {
      expect(tokenize('C# Developer')).toEqual(['c#', 'developer']);
      expect(tokenize('C++ Developer')).toEqual(['c++', 'developer']);
    });
  });

  describe('filterAndRankJobsByRelevance', () => {
    it('rejects mid-level roles on a leadership search', () => {
      const jobs = [
        { title: 'Group Head of Finance' },
        { title: 'Group Financial Accountant' },
        { title: 'Finance Analyst' },
        { title: 'Finance Assistant' }
      ];

      const result = filterAndRankJobsByRelevance(jobs, 'Group Head of Finance');

      expect(result.map((j) => j.title)).toEqual(['Group Head of Finance']);
    });

    it('preserves qualified leadership variations', () => {
      const jobs = [
        { title: 'Head of Finance & Corporate Accounting' },
        { title: 'Director of Group Finance' }
      ];

      const result = filterAndRankJobsByRelevance(jobs, 'Group Head of Finance');

      expect(result.map((j) => j.title)).toEqual([
        'Head of Finance & Corporate Accounting',
        'Director of Group Finance'
      ]);
    });

    it('requires 100% token overlap for a 1-2 word query', () => {
      const jobs = [{ title: 'Senior Developer' }, { title: 'Developer Relations Lead' }];

      const result = filterAndRankJobsByRelevance(jobs, 'Developer');

      // "Senior Developer" contains "developer" -> 100% overlap, passes.
      // "Developer Relations Lead" also contains "developer" -> passes too,
      // but is a Manager/Lead-tier title, still >= Mid/Core tier of "Developer".
      expect(result.map((j) => j.title)).toEqual(['Senior Developer', 'Developer Relations Lead']);
    });

    it('requires >= 66% token overlap for a 3+ word query', () => {
      const jobs = [
        { title: 'Group Head of Finance' }, // 3/3 overlap
        { title: 'Head of Finance' }, // 2/3 overlap (>= 66%)
        { title: 'Head' } // 1/3 overlap (< 66%), also fails on missing "finance" domain relevance
      ];

      const result = filterAndRankJobsByRelevance(jobs, 'Group Head of Finance');

      expect(result.map((j) => j.title)).toEqual(['Group Head of Finance', 'Head of Finance']);
    });

    it('sorts results by relevance score descending', () => {
      const jobs = [{ title: 'Head of Finance' }, { title: 'Group Head of Finance' }];

      const result = filterAndRankJobsByRelevance(jobs, 'Group Head of Finance');

      expect(result.map((j) => j.title)).toEqual(['Group Head of Finance', 'Head of Finance']);
    });

    it('returns jobs unchanged when the search title has no meaningful tokens', () => {
      const jobs = [{ title: 'Anything' }];

      expect(filterAndRankJobsByRelevance(jobs, 'of the')).toEqual(jobs);
    });
  });

  describe('extractSearchAnchorPhrase', () => {
    it('strips a recognized leading modifier', () => {
      expect(extractSearchAnchorPhrase('Group Head of Finance')).toBe('Head of Finance');
    });

    it('is a no-op on an already-minimal title', () => {
      expect(extractSearchAnchorPhrase('Head of Finance')).toBe('Head of Finance');
    });

    it('is a no-op when a pre-token is not a recognized modifier', () => {
      expect(extractSearchAnchorPhrase('Finance Director')).toBe('Finance Director');
    });

    it('is a conservative no-op when a non-modifier sits between the modifier and the anchor', () => {
      expect(extractSearchAnchorPhrase('Group Finance Director')).toBe('Group Finance Director');
    });

    it('is a no-op when no seniority-tier token exists at all', () => {
      expect(extractSearchAnchorPhrase('Data Pipeline')).toBe('Data Pipeline');
    });

    it('strips multiple stacked recognized modifiers', () => {
      expect(extractSearchAnchorPhrase('UK Group Head of Finance')).toBe('Head of Finance');
    });
  });

  describe('regression guard', () => {
    it('never lets SCOPE_MODIFIERS overlap with seniority-tier vocabulary', () => {
      const overlap = ALL_SENIORITY_WORDS.filter((word) => SCOPE_MODIFIERS.has(word));
      expect(overlap).toEqual([]);
    });
  });
});
