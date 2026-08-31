import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type MigrateOldHandler = (event: H3Event) => Promise<{ success: boolean; message: string }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockBenchmarksGet = vi.fn();
const mockTitlesGet = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatch = vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit }));
const mockCollection = vi.fn((name: string) => {
  if (name === 'salary_benchmarks') {
    return { where: vi.fn(() => ({ get: mockBenchmarksGet })) };
  }
  if (name === 'job_titles') {
    return { get: mockTitlesGet };
  }
  return { doc: vi.fn((id: string) => ({ id })) };
});
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection, batch: mockBatch }))
}));

describe('admin job-groups/migrate-old endpoint', () => {
  let handler: MigrateOldHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../migrate-old');
    handler = mod.default as unknown as MigrateOldHandler;

    mockBatchSet.mockReturnValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('reports no benchmarks found for the requested country', async () => {
    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockBenchmarksGet.mockResolvedValue({ empty: true, docs: [] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: false, message: 'No benchmarks found for UK.' });
  });

  it('groups UK benchmarks by id_code and enriches with job_titles synonyms', async () => {
    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockBenchmarksGet.mockResolvedValue({
      empty: false,
      docs: [{ data: (): unknown => ({ id_code: '2136', title: 'Software Developers' }) }]
    });
    mockTitlesGet.mockResolvedValue({
      docs: [{ data: (): unknown => ({ soc: '2136', title: ' Senior Engineer ' }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      message: 'Successfully migrated 1 base groups into uk_job_groups!'
    });
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2136' }),
      { group_name: 'Software Developers', titles: ['senior engineer'] },
      { merge: true }
    );
  });

  it('skips the job_titles enrichment step for USA', async () => {
    mockReadBody.mockResolvedValue({ country: 'USA' });
    mockBenchmarksGet.mockResolvedValue({
      empty: false,
      docs: [{ data: (): unknown => ({ id_code: '15-1252', title: 'Software Engineers' }) }]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(mockTitlesGet).not.toHaveBeenCalled();
    expect(res.message).toContain('usa_job_groups');
  });

  it('skips benchmark docs without an id_code and job_titles docs without a matching soc/title', async () => {
    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockBenchmarksGet.mockResolvedValue({
      empty: false,
      docs: [
        { data: (): unknown => ({ id_code: '', title: 'No Code' }) },
        { data: (): unknown => ({ id_code: '2136', title: 'Software Developers' }) },
        { data: (): unknown => ({ id_code: '2136' }) }
      ]
    });
    mockTitlesGet.mockResolvedValue({
      docs: [
        { data: (): unknown => ({ soc: '', title: 'Missing SOC' }) },
        { data: (): unknown => ({ soc: '9999' }) },
        { data: (): unknown => ({ soc: '9999', title: 'Unmatched Synonym' }) }
      ]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      message: 'Successfully migrated 1 base groups into uk_job_groups!'
    });
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2136' }),
      { group_name: 'Software Developers', titles: [] },
      { merge: true }
    );
  });

  it('commits an intermediate batch every 450 docs and skips the trailing commit on an exact multiple', async () => {
    mockReadBody.mockResolvedValue({ country: 'USA' });
    mockBenchmarksGet.mockResolvedValue({
      empty: false,
      docs: Array.from({ length: 450 }, (_, i) => ({
        data: (): unknown => ({ id_code: `code-${i}`, title: `Title ${i}` })
      }))
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.message).toContain('450');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(mockBatch).toHaveBeenCalledTimes(2);
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockReadBody.mockResolvedValue({ country: 'UK' });
    mockBenchmarksGet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Migration failed');
  });
});
