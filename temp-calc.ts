import { calculateUKBenchmarkScore } from './shared/utils/uk';

const mockNationalData = {
  mean: 42000,
  p10: 20000,
  p25: 30000,
  p50: 40000,
  p75: 50000,
  p90: 60000
};
const mockRegionalData = {
  mean: 52000,
  p10: 30000,
  p25: 40000,
  p50: 50000,
  p75: 60000,
  p90: 70000
};
const mockBuckets = [{ value: 40000, count: 50 }];

console.log('A1:', calculateUKBenchmarkScore(50000, mockNationalData, mockNationalData, 'All', mockRegionalData, 50000, 40000, mockBuckets, 200, 40000).score);
console.log('A2:', calculateUKBenchmarkScore(50000, mockNationalData, mockNationalData, 'All', mockRegionalData, null, null, mockBuckets, 10, 40000).score);
console.log('B:', calculateUKBenchmarkScore(50000, mockNationalData, null, '', null, null, null, mockBuckets, 100, 40000).score);
console.log('C:', calculateUKBenchmarkScore(50000, mockNationalData, mockNationalData, 'All', mockRegionalData, null, null, [], 0, 0).score);
