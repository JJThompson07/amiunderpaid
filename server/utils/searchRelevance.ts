/**
 * Server-side job title relevance scoring, seniority-hierarchy guardrails, and
 * a shared "search anchor phrase" extractor consumed by Reed, Adzuna, and
 * Jooble's query builders (see openspec/changes/uk-reed-preference-and-search-refinement).
 */

export type CandidateJob = {
  title: string;
  salary_min?: number;
  salary_max?: number;
};

const STOP_WORDS = new Set(['of', 'and', '&', 'the', 'in', 'for', 'to', 'at', 'by', 'with']);

// Domain stemming: variant word -> canonical form, so e.g. "financial" and
// "finance" are treated as the same token when comparing candidate/search titles.
const DOMAIN_STEMS: Record<string, string> = {
  financial: 'finance',
  accounting: 'accountant',
  development: 'developer'
};

type SeniorityTier = 'executive' | 'head_director' | 'manager_lead' | 'mid_core' | 'junior_entry';

const SENIORITY_TIERS: Record<SeniorityTier, string[]> = {
  executive: ['chief', 'cfo', 'ceo', 'cto', 'coo', 'cmo', 'vp', 'president'],
  head_director: ['head', 'director', 'partner', 'principal'],
  manager_lead: ['manager', 'lead', 'supervisor', 'controller'],
  mid_core: [
    'accountant',
    'engineer',
    'analyst',
    'consultant',
    'specialist',
    'developer',
    'designer',
    'officer',
    'auditor',
    'executive',
    // Healthcare / Medical
    'nurse',
    'doctor',
    'physician',
    'therapist',
    'clinician',
    'practitioner',
    'pharmacist',
    'paramedic',
    'optometrist',
    // Education / Academia
    'teacher',
    'lecturer',
    'tutor',
    'instructor',
    'educator',
    'professor',
    'academic',
    // Legal / Compliance
    'lawyer',
    'solicitor',
    'barrister',
    'paralegal',
    'counsel',
    'attorney',
    // Operations / Business / Admin
    'recruiter',
    'coordinator',
    'administrator',
    'advisor',
    'representative',
    'agent',
    'buyer',
    'planner',
    'estimator',
    'underwriter',
    'clerk',
    'scientist',
    'researcher',
    'technician',
    'mechanic',
    'architect',
    'surveyor',
    'economist',
    'statistician',
    // Construction / Trades / Industry
    'electrician',
    'plumber',
    'carpenter',
    'builder',
    'machinist',
    'fitter',
    'welder',
    'operator',
    'operative'
  ],
  junior_entry: ['assistant', 'junior', 'trainee', 'intern', 'graduate', 'apprentice', 'associate']
};

// Rank order used to compare seniority: higher = more senior.
const TIER_RANK: Record<SeniorityTier, number> = {
  executive: 4,
  head_director: 3,
  manager_lead: 2,
  mid_core: 1,
  junior_entry: 0
};

// Scope-modifier denylist for extractSearchAnchorPhrase. Deliberately excludes
// every word already present in SENIORITY_TIERS above (head, chief, director,
// lead, principal, junior, associate) -- those are the signal the anchor scan
// searches FOR, and stripping them would erase the seniority anchor the
// hierarchy guardrail depends on. See design.md sec 2 for the full rationale
// and the live-Reed-data evidence behind each entry.
export const SCOPE_MODIFIERS = new Set([
  // Geographic / territorial
  'global',
  'international',
  'worldwide',
  'regional',
  'national',
  'territory',
  'area',
  'emea',
  'apac',
  'latam',
  'uk',
  'us',
  // Organizational / business scope
  'group',
  'divisional',
  'corporate',
  'enterprise',
  'commercial',
  'central',
  'strategic',
  // Contractual / engagement mode
  'interim',
  'fractional',
  'acting',
  'contract',
  'permanent',
  'freelance',
  // Intensifier
  'senior'
]);

const normalizeWord = (word: string): string => word.toLowerCase().replace(/[^a-z0-9]/gi, '');

const stemToken = (token: string): string => DOMAIN_STEMS[token] ?? token;

/**
 * Lowercases, strips punctuation/stop-words, and applies domain stemming.
 * Retains `#`/`+` as token characters (not just separators) so technical
 * tokens like "c#" and "c++" survive intact instead of collapsing to "c" --
 * without this, a "C# Developer" search would score a plain "C Developer"
 * listing as a 100% title match.
 */
export const tokenize = (title: string): string[] =>
  title
    .toLowerCase()
    .split(/[^a-z0-9&+#]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .map(stemToken);

export const classifySeniorityTier = (token: string): SeniorityTier | null => {
  const tiers = Object.keys(SENIORITY_TIERS) as SeniorityTier[];
  for (const tier of tiers) {
    if (SENIORITY_TIERS[tier].includes(token)) {
      return tier;
    }
  }
  return null;
};

const getHighestSeniorityTier = (tokens: string[]): SeniorityTier | null => {
  let best: SeniorityTier | null = null;
  for (const token of tokens) {
    const tier = classifySeniorityTier(token);
    if (tier && (best === null || TIER_RANK[tier] > TIER_RANK[best])) {
      best = tier;
    }
  }
  return best;
};

const isSeniorityCompatible = (searchTokens: string[], candidateTokens: string[]): boolean => {
  const searchTier = getHighestSeniorityTier(searchTokens);
  if (searchTier === null) {
    return true;
  }
  const candidateTier = getHighestSeniorityTier(candidateTokens);
  if (candidateTier === null) {
    return false;
  }
  return TIER_RANK[candidateTier] >= TIER_RANK[searchTier];
};

/**
 * True for a token whose literal (stemmed) presence in a candidate title is
 * mandatory. Everything is required *except* SCOPE_MODIFIERS (optional --
 * extractSearchAnchorPhrase already treats these as strippable) and the four
 * hierarchy-LEVEL seniority tiers (executive/head_director/manager_lead/
 * junior_entry, e.g. "head"/"director"/"lead"/"junior" -- near-synonyms
 * *within* a tier, so isSeniorityCompatible's tier-rank comparison is the
 * right test for them, not literal identity).
 *
 * `mid_core` is deliberately NOT exempted here even though it's part of
 * SENIORITY_TIERS: it enumerates profession/role nouns (engineer, nurse,
 * analyst, ...), and words within it are not interchangeable with each other
 * just because they share a tier rank -- an "engineer" is not a "nurse". See
 * design.md Decision 1's Reviewer Correction for the worked-example evidence
 * behind this split.
 */
const isRequiredToken = (token: string): boolean => {
  const tier = classifySeniorityTier(token);
  if (tier !== null && tier !== 'mid_core') {
    return false;
  }
  return !SCOPE_MODIFIERS.has(token);
};

/**
 * Fraction (0-1) of search-title tokens present in the candidate title, after
 * normalization. Returns 0 if any required token (see isRequiredToken) from
 * the search title -- a domain-specific token, or a mid_core role-noun -- is
 * absent from the candidate title, regardless of how many optional
 * (scope-modifier / hierarchy-level) tokens otherwise overlap.
 */
export const calculateTitleRelevanceScore = (
  candidateTitle: string,
  searchTitle: string
): number => {
  const searchTokens = tokenize(searchTitle);
  if (searchTokens.length === 0) {
    return 0;
  }
  const candidateTokens = new Set(tokenize(candidateTitle));
  const requiredTokens = searchTokens.filter(isRequiredToken);
  if (requiredTokens.some((t) => !candidateTokens.has(t))) {
    return 0;
  }
  const overlapCount = searchTokens.filter((t) => candidateTokens.has(t)).length;
  return overlapCount / searchTokens.length;
};

/**
 * Filters candidate jobs down to those whose title contains every required
 * search token (see isRequiredToken) and that satisfy the seniority-hierarchy
 * guardrail, then sorts most-relevant first. There is no separate fractional
 * overlap threshold for optional (scope-modifier / hierarchy-level) tokens --
 * once all required tokens match and hierarchy compatibility holds, the
 * candidate is accepted regardless of how many optional tokens differ.
 */
export const filterAndRankJobsByRelevance = <T extends CandidateJob>(
  jobs: T[],
  searchTitle: string
): T[] => {
  const searchTokens = tokenize(searchTitle);
  if (searchTokens.length === 0) {
    return jobs;
  }

  return jobs
    .map((job) => ({ job, score: calculateTitleRelevanceScore(job.title, searchTitle) }))
    .filter(({ job, score }) => {
      if (score === 0) {
        return false;
      }
      return isSeniorityCompatible(searchTokens, tokenize(job.title));
    })
    .sort((a, b) => b.score - a.score)
    .map(({ job }) => job);
};

/**
 * Derives a shortened "anchor phrase" from a full search title by stripping a
 * *leading run* of SCOPE_MODIFIERS tokens up to the first seniority-tier
 * token, returning the remainder verbatim (a valid literal substring of the
 * input, for use in exact-phrase provider queries). If any token before the
 * first seniority-tier token is unrecognized, or no seniority-tier token
 * exists at all, returns the title unchanged rather than guess.
 */
export const extractSearchAnchorPhrase = (searchTitle: string): string => {
  const matches = [...searchTitle.matchAll(/\S+/g)];
  if (matches.length === 0) {
    return searchTitle;
  }

  const normalizedWords = matches.map((m) => normalizeWord(m[0]));
  const seniorityIndex = normalizedWords.findIndex((w) => classifySeniorityTier(w) !== null);
  if (seniorityIndex === -1) {
    return searchTitle;
  }

  const preWords = normalizedWords.slice(0, seniorityIndex);
  const allModifiers = preWords.every((w) => SCOPE_MODIFIERS.has(w));
  if (preWords.length === 0 || !allModifiers) {
    return searchTitle;
  }

  const startCharIndex = matches[seniorityIndex]!.index!;
  return searchTitle.slice(startCharIndex).trim();
};

// Exposed for the regression-guard test (SCOPE_MODIFIERS must never overlap
// with seniority-tier vocabulary -- see searchRelevance.spec.ts).
export const ALL_SENIORITY_WORDS: string[] = Object.values(SENIORITY_TIERS).flat();
