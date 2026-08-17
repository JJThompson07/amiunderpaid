import { describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { verifyAdmin } from '../../../utils/firebase';
vi.stubGlobal('defineEventHandler', (fn: any) => fn);
vi.stubGlobal('getQuery', () => ({}));
vi.stubGlobal('createError', (err: any) => new Error(err.message));

import handler from '../search-logs.get';

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
        get: vi.fn(() => ({ data: () => ({ count: 0 }) }))
      })),
      where: vi.fn().mockReturnThis()
    }))
  }))
}));

describe('Admin Search Logs Endpoint', () => {
  it('should enforce admin authorization via verifyAdmin', async () => {
    const event = { context: {} } as unknown as H3Event;
    
    // Simulate verifyAdmin throwing an error (e.g. 403)
    const error = new Error('Forbidden');
    (verifyAdmin as any).mockRejectedValueOnce(error);

    await expect(handler(event)).rejects.toThrow('Forbidden');
    expect(verifyAdmin).toHaveBeenCalledWith(event);
  });
});
