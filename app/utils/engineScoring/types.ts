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
  microPercentile: number;
  livePercentile: number | null;
}

// The final object returned to your Vue components
export interface BenchmarkResult {
  score: number;
  breakdown: ScoreBreakdown;
}
