import { describe, expect, it } from 'vitest';
import { filterFaqSections } from '../faqFilter';
import type { FaqSection } from '../faqFilter';

const sections: FaqSection[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      { key: 'underpaid', question: 'Am I being underpaid?', answer: 'Check your MCA Score.' },
      { key: 'wage', question: 'What is the average wage?', answer: 'It depends on location.' }
    ]
  },
  {
    id: 'mca',
    title: 'MCA',
    items: [{ key: 'brackets', question: 'What are the brackets?', answer: 'Five tiers exist.' }]
  }
];

describe('filterFaqSections', () => {
  it('returns all sections unchanged when the query is empty', () => {
    expect(filterFaqSections(sections, '')).toEqual(sections);
  });

  it('matches case-insensitively against the question', () => {
    const result = filterFaqSections(sections, 'UNDERPAID');
    expect(result).toHaveLength(1);
    expect(result[0]?.items).toHaveLength(1);
    expect(result[0]?.items[0]?.key).toBe('underpaid');
  });

  it('matches case-insensitively against the answer', () => {
    const result = filterFaqSections(sections, 'five tiers');
    expect(result).toHaveLength(1);
    expect(result[0]?.items[0]?.key).toBe('brackets');
  });

  it('drops sections with no matching items', () => {
    const result = filterFaqSections(sections, 'unmatched keyword');
    expect(result).toEqual([]);
  });

  it('trims surrounding whitespace before matching', () => {
    const result = filterFaqSections(sections, '  underpaid  ');
    expect(result).toHaveLength(1);
  });
});
