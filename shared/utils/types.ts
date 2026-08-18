export type PercentileData = {
  mean: number; // Average salary, can be null if not available;
  p10: number | null;
  p25: number | null;
  p50: number; // Median is required
  p75: number | null;
  p90: number | null;
};

// The detailed breakdown of how the score was calculated
export type ScoreBreakdown = {
  modifier: number;
  normalizedSalary: number;
  macroPercentile: number;
  microPercentile: number | null; // Can be null if micro data is missing
  livePercentile: number | null;
};

export type BenchmarkResult = {
  score: number;
  confidenceScore: number; // 0-10 scale indicating confidence based on data availability
  breakdown: ScoreBreakdown;
};

export type HistogramBucket = {
  value: number;
  count: number;
};

// A recruiter's claim on a territory/category combination, including any
// exclusive months they have secured within it.
export type TerritoryClaim = {
  territoryId: number;
  categoryValue: string;
  isBasic: boolean;
  exclusiveMonths: string[];
  territoryName?: string;
  band?: number;
};

// Recruiter user profile as stored in the `users` Firestore collection.
export type UserProfile = {
  uid?: string;
  email?: string;
  agency_name?: string;
  billingCountry?: string;
  basicDiscount?: number;
  exclusiveDiscount?: number;
  coveredCategories?: string[];
  activeTerritories?: TerritoryClaim[];
  claims?: TerritoryClaim[];
};

// A recruiter/agency lead-gen card, as returned by /api/user/search/recruiter-card
export type RecruiterCard = {
  recruiterId: string;
  isExclusive: boolean;
  title: string | null;
  content: string | null;
  categoryContent?: string | null;
  brandBgColour: string;
  brandTextColour: string;
  buttonText: string | null;
  logoUrl: string | null;
  agencyName: string | null;
};

// A job-group record as indexed in Algolia (usa_job_groups / uk_job_groups indices).
// Large title lists are split into multiple chunk records sharing the same gov_id.
export type AlgoliaJobGroupRecord = {
  objectID: string;
  gov_id: string;
  group_name: string;
  titles: string[];
};

// Unified context object for passing parameters to scorers without tight coupling
export type EngineContext = {
  userSalary: number;
  macroNationalData: PercentileData;
  macroRegionalData?: PercentileData | null;
  microNationalData: PercentileData | null;
  microRegionalData: PercentileData | null;
  microNationalOfficialTitle?: string | null;
  regionalMedianAllRoles: number | null;
  nationalMedianAllRoles: number | null;
  liveBuckets: HistogramBucket[];
  totalLiveJobs: number;
  meanLiveSalary: number;
};
