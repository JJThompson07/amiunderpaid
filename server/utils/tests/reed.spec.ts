import { describe, expect, it, vi } from 'vitest';
import type { ReedJobResponse } from '../reed';
import { fetchReedData, processReedData } from '../reed';

describe('Reed Utility', () => {
  it('should process Reed job data and calculate mean and histogram correctly', () => {
    const mockResponse: ReedJobResponse = {
      totalResults: 5,
      results: [
        {
          jobId: 1,
          employerName: 'Company A',
          jobTitle: 'Developer',
          locationName: 'London',
          minimumSalary: 40000,
          maximumSalary: 60000, // avg 50000 -> bucket 50000
          currency: 'GBP',
          jobDescription: 'Great job',
          jobUrl: 'http://reed.co.uk/1'
        },
        {
          jobId: 2,
          employerName: 'Company B',
          jobTitle: 'Senior Developer',
          locationName: 'London',
          minimumSalary: 55000,
          maximumSalary: 65000, // avg 60000 -> bucket 60000
          currency: 'GBP',
          jobDescription: 'Another job',
          jobUrl: 'http://reed.co.uk/2'
        },
        {
          jobId: 3,
          employerName: 'Company C',
          jobTitle: 'Missing Salary',
          locationName: 'London',
          minimumSalary: null,
          maximumSalary: null,
          currency: 'GBP',
          jobDescription: 'No salary',
          jobUrl: 'http://reed.co.uk/3'
        }
      ]
    };

    const processed = processReedData(mockResponse, 'full-time', 'permanent');

    expect(processed.provider).toBe('reed');
    expect(processed.count).toBe(5);

    // Mean should be (50000 + 60000) / 2 = 55000
    expect(processed.mean).toBe(55000);

    // Histogram should have 1 count at 50000 and 1 at 60000
    expect(processed.histogram).toEqual({
      50000: 1,
      60000: 1
    });

    // It should map to Adzuna format and be sorted by max salary descending
    expect(processed.results[0]).toMatchObject({
      id: 2,
      title: 'Senior Developer',
      location: { display_name: 'London', area: ['London'] },
      salary_min: 55000,
      salary_max: 65000,
      contract_time: 'full-time',
      contract_type: 'permanent',
      provider: 'reed'
    });
  });

  it('should handle empty results safely', () => {
    const mockResponse: ReedJobResponse = {
      totalResults: 0,
      results: []
    };

    const processed = processReedData(mockResponse, 'part-time', 'contract');

    expect(processed.mean).toBe(0);
    expect(processed.count).toBe(0);
    expect(processed.histogram).toEqual({});
    expect(processed.results.length).toBe(0);
    expect(processed.provider).toBe('reed');
  });
  describe('fetchReedData', () => {
    it('should throw error if API key is missing', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: null }))
      );
      vi.stubGlobal('createError', (err: any) => new Error(err.statusMessage));

      await expect(fetchReedData('Dev', '', 'full-time', 'permanent')).rejects.toThrow(
        'Market data service is misconfigured.'
      );
    });

    it('should fetch and process data successfully', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 1, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      const result = await fetchReedData('Dev', 'London', 'full-time', 'permanent');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            keywords: 'Dev',
            locationName: 'London',
            fullTime: true,
            permanent: true
          })
        })
      );
      expect(result.count).toBe(1);
    });

    it('should handle mapped locations and part-time/contract params', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', 'yorkshire and the humber, uk', 'part-time', 'contract');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            locationName: 'Yorkshire', // mapped
            partTime: true,
            contract: true
          })
        })
      );
    });

    it('should handle temp param', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      const fetchMock = vi.fn().mockResolvedValue({ totalResults: 0, results: [] });
      vi.stubGlobal('$fetch', fetchMock);

      await fetchReedData('Dev', '', '', 'temp');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://www.reed.co.uk/api/1.0/search',
        expect.objectContaining({
          params: expect.objectContaining({
            temp: true
          })
        })
      );
    });

    it('should throw error on fetch failure', async () => {
      vi.stubGlobal(
        'useRuntimeConfig',
        vi.fn(() => ({ reedApiKey: 'test-key' }))
      );
      vi.stubGlobal('createError', (err: any) => new Error(err.statusMessage));
      vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      await expect(fetchReedData('Dev', '', 'full-time', 'permanent')).rejects.toThrow(
        'Failed to fetch from Reed API'
      );
    });
  });
});
