export type FaqItem = {
  key: string;
  question: string;
  answer: string;
};

export type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

export const filterFaqSections = (sections: FaqSection[], query: string): FaqSection[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(normalized) ||
          item.answer.toLowerCase().includes(normalized)
      )
    }))
    .filter((section) => section.items.length > 0);
};
