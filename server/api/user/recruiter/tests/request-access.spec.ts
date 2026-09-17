import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type RequestAccessHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('isError', (e: unknown) => e instanceof Error && 'statusCode' in e);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

vi.stubGlobal('getRequestHost', () => 'www.amiunderpaid.co.uk');
vi.stubGlobal('getRequestProtocol', () => 'https');

const mockExistingGet = vi.fn();
const mockUsersAdd = vi.fn();
const mockCollection = vi.fn(() => ({
  where: vi.fn(() => ({ get: mockExistingGet })),
  add: mockUsersAdd
}));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('user recruiter/request-access endpoint', () => {
  let handler: RequestAccessHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../request-access.post');
    handler = mod.default as unknown as RequestAccessHandler;

    mockReadBody.mockResolvedValue({ agencyName: '  Acme Recruiting  ', email: 'Rec@Example.com' });
    mockExistingGet.mockResolvedValue({ empty: true, docs: [] });
    mockUsersAdd.mockResolvedValue({ id: 'user_1' });
  });

  it('rejects when required fields are missing', async () => {
    mockReadBody.mockResolvedValue({ agencyName: '', email: '' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing required fields');
  });

  it('rejects an invalid email address', async () => {
    mockReadBody.mockResolvedValue({ agencyName: 'Acme', email: 'not-an-email' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid email address');
  });

  it('rejects when the email is already associated with an account', async () => {
    mockExistingGet.mockResolvedValue({ empty: false, docs: [{ id: 'existing' }] });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'This email is already associated with a partner account.'
    );
  });

  it('trims and lowercases fields before saving a requested recruiter', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockUsersAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        agency_name: 'Acme Recruiting',
        email: 'rec@example.com',
        role: 'recruiter',
        status: 'requested'
      })
    );
  });

  it('persists the resolved brand and site URL for an amiunderpaid request', async () => {
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockUsersAdd).toHaveBeenCalledWith(
      expect.objectContaining({ site: 'amiunderpaid', siteUrl: 'https://www.amiunderpaid.co.uk' })
    );
  });

  it('persists the resolved brand and site URL for a benchmarkmyrole request', async () => {
    vi.stubGlobal('getRequestHost', () => 'www.benchmarkmyrole.com');
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockUsersAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'benchmarkmyrole',
        siteUrl: 'https://www.benchmarkmyrole.com'
      })
    );

    vi.stubGlobal('getRequestHost', () => 'www.amiunderpaid.co.uk');
  });

  it('rethrows an H3 error unmodified', async () => {
    mockExistingGet.mockRejectedValueOnce(
      Object.assign(new Error('service unavailable'), { statusCode: 503 })
    );
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('service unavailable');
  });

  it('wraps a non-H3 failure in a generic 500', async () => {
    mockExistingGet.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Failed to submit access request. Please try again later.'
    );
  });
});
