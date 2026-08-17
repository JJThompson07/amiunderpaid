import { calculateUSABenchmarkScore } from './shared/utils/usa';

const mockNationalData = {
  mean: 85000,
  p10: 40000,
  p25: 60000,
  p50: 80000,
  p75: 100000,
  p90: 120000
};
const mockBuckets = [{ value: 80000, count: 100 }];

console.log('USA C:', calculateUSABenchmarkScore(100000, mockNationalData, null, null, null, null, null, mockBuckets, 100, 80000).score);
