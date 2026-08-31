import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type JobGroupsHandler = (event: H3Event) => Promise<{
  success: boolean;
  groups: { id_code: string; group_name: string; titles: string[] }[];
}>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

let mockQuery: Record<string, string>;
vi.stubGlobal('getQuery', () => mockQuery);

const mockGet = vi.fn();
const mockCollection = vi.fn(() => ({ get: mockGet }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('admin job-groups listing endpoint', () => {
  let handler: JobGroupsHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../index');
    handler = mod.default as unknown as JobGroupsHandler;

    mockQuery = {};
    mockGet.mockResolvedValue({
      docs: [
        {
          id: '2136',
          data: (): unknown => ({ group_name: 'Software Developers', titles: ['engineer'] })
        },
        { id: '1136', data: (): unknown => ({}) }
      ]
    });
  });

  it('defaults to the UK collection and sorts groups by id_code', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('uk_job_groups');
    expect(res.groups.map((g) => g.id_code)).toEqual(['1136', '2136']);
    expect(res.groups[1]).toEqual({
      id_code: '2136',
      group_name: 'Software Developers',
      titles: ['engineer']
    });
  });

  it('defaults missing group_name/titles fields', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.groups[0]).toEqual({ id_code: '1136', group_name: 'Unknown Group', titles: [] });
  });

  it('uses the USA collection when country=USA', async () => {
    mockQuery = { country: 'USA' };
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockCollection).toHaveBeenCalledWith('usa_job_groups');
  });

  it('wraps a Firestore failure in an opaque 500', async () => {
    mockGet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Failed to fetch job groups');
  });
});
