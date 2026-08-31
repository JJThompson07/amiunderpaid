import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type RecruitersHandler = (
  event: H3Event
) => Promise<{ success: boolean; recruiters: Record<string, unknown>[] }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => new Error(err.statusMessage));
vi.stubGlobal('getRequestHeader', () => mockAuthHeader);

let mockAuthHeader: string | undefined;
const mockVerifyIdToken = vi.fn();
const mockGetUsers = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken, getUsers: mockGetUsers }))
}));

const mockUsersGet = vi.fn();
const mockPricingGet = vi.fn();
const mockCollection = vi.fn((name: string) => {
  if (name === 'platform_settings') {
    return { doc: vi.fn(() => ({ get: mockPricingGet })) };
  }
  return { where: vi.fn(() => ({ get: mockUsersGet })) };
});
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('admin recruiters listing endpoint', () => {
  let handler: RecruitersHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../index.get');
    handler = mod.default as unknown as RecruitersHandler;

    mockAuthHeader = 'Bearer valid-token';
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin_1' });
    mockPricingGet.mockResolvedValue({ data: () => ({ UK: { band1: { basic: 100 } } }) });
    mockGetUsers.mockResolvedValue({ users: [{ uid: 'rec1', emailVerified: true }] });
  });

  it('rejects without a Bearer token', async () => {
    mockAuthHeader = undefined;
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow();
  });

  it('computes each recruiter monthly invoice from their active basic territories, applying any discount', async () => {
    mockUsersGet.mockResolvedValue({
      docs: [
        {
          id: 'rec1',
          data: (): unknown => ({
            status: 'active',
            email: 'rec@example.com',
            agency_name: 'Acme Recruiting',
            billingCountry: 'UK',
            basicDiscount: 10,
            activeTerritories: [{ isBasic: true, band: 1 }]
          })
        }
      ]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.success).toBe(true);
    expect(res.recruiters).toEqual([
      expect.objectContaining({
        id: 'rec1',
        monthlyInvoice: 90,
        verified: true,
        status: 'active'
      })
    ]);
  });

  it('applies defaults for sparse fields and marks a non-active recruiter unverified without a discount', async () => {
    mockUsersGet.mockResolvedValue({
      docs: [
        {
          id: 'rec-sparse',
          data: (): unknown => ({})
        },
        {
          id: 'rec-inactive',
          data: (): unknown => ({ status: 'inactive', activeTerritories: [{ isBasic: false }] })
        }
      ]
    });
    mockGetUsers.mockResolvedValue({ users: [] });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.recruiters).toEqual([
      expect.objectContaining({
        id: 'rec-sparse',
        agencyName: 'N/A',
        billingCountry: 'UK',
        status: 'active',
        verified: false,
        monthlyInvoice: 0,
        categories: [],
        basicDiscount: 0,
        exclusiveDiscount: 0
      }),
      expect.objectContaining({
        id: 'rec-inactive',
        status: 'inactive',
        verified: false,
        monthlyInvoice: 0
      })
    ]);
  });

  it('excludes requested/rejected recruiters from the email-verification lookup', async () => {
    mockUsersGet.mockResolvedValue({
      docs: [
        { id: 'rec2', data: (): unknown => ({ status: 'requested', email: 'pending@example.com' }) }
      ]
    });
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(mockGetUsers).not.toHaveBeenCalled();
    expect(res.recruiters[0]).toEqual(expect.objectContaining({ verified: false }));
  });
});
