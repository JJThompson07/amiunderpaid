export interface PercentileData {
  mean: number; // Average salary, can be null if not available;
  p10: number | null;
  p25: number | null;
  p50: number; // Median is required
  p75: number | null;
  p90: number | null;
}

// The detailed breakdown of how the score was calculated
export interface ScoreBreakdown {
  modifier: number;
  normalizedSalary: number;
  macroPercentile: number;
  microPercentile: number | null; // Can be null if micro data is missing
  livePercentile: number | null;
}

// The final object returned to your Vue components
export interface BenchmarkResult {
  score: number;
  confidenceScore: number; // 0-10 scale indicating confidence based on data availability
  breakdown: ScoreBreakdown;
}
