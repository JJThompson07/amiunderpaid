import { describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import { verifyAdmin } from '../../../utils/firebase';

import handler from '../search-logs.get';
vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('getQuery', () => ({}));
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.message));

vi.mock('../../../utils/firebase', () => ({
  verifyAdmin: vi.fn(),
  useAdminApp: vi.fn(),
  useAdminFirestore: vi.fn()
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn(() => ({ docs: [], empty: true }))
        })),
        offset: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(() => ({ docs: [], empty: true }))
          }))
        }))
      })),
      count: vi.fn(() => ({
        get: vi.fn(() => ({ data: (): { count: number } => ({ count: 0 }) }))
      })),
      where: vi.fn().mockReturnThis()
    }))
  }))
}));

describe('Admin Search Logs Endpoint', () => {
  it('should enforce admin authorization via verifyAdmin', async (): Promise<void> => {
    const event = { context: {} } as unknown as H3Event;

    // Simulate verifyAdmin throwing an error (e.g. 403)
    const error = new Error('Forbidden');
    vi.mocked(verifyAdmin).mockRejectedValueOnce(error);

    await expect(handler(event)).rejects.toThrow('Forbidden');
    expect(verifyAdmin).toHaveBeenCalledWith(event);
  });
});
