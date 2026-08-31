import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type SubmitLeadHandler = (event: H3Event) => Promise<{ success: boolean; leadId: string }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('isError', (e: unknown) => e instanceof Error && 'statusCode' in e);

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockRecruiterGet = vi.fn();
const mockLeadsAdd = vi.fn();
const mockMailAdd = vi.fn();
const mockCollection = vi.fn((name: string) => {
  if (name === 'users') {
    return { doc: vi.fn(() => ({ get: mockRecruiterGet })) };
  }
  if (name === 'leads') {
    return { add: mockLeadsAdd };
  }
  return { add: mockMailAdd };
});
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('user leads/submit endpoint', () => {
  let handler: SubmitLeadHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../submit.post');
    handler = mod.default as unknown as SubmitLeadHandler;

    mockReadBody.mockResolvedValue({
      name: 'Jane <Doe>',
      email: 'jane@example.com',
      recruiterId: 'rec_1',
      searchedRole: 'Engineer',
      location: 'London'
    });
    mockRecruiterGet.mockResolvedValue({
      exists: true,
      data: () => ({ inboundEmail: 'inbox@agency.com', agency_name: 'Acme' })
    });
    mockLeadsAdd.mockResolvedValue({ id: 'lead_1' });
    mockMailAdd.mockResolvedValue(undefined);
  });

  it('rejects when required fields are missing', async () => {
    mockReadBody.mockResolvedValue({ name: '', email: '', recruiterId: '' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Missing required fields');
  });

  it('rejects an invalid email format', async () => {
    mockReadBody.mockResolvedValue({ name: 'Jane', email: 'not-an-email', recruiterId: 'rec_1' });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid email format');
  });

  it('propagates a 404 when the recruiter does not exist, instead of masking it as a 500', async () => {
    mockRecruiterGet.mockResolvedValue({ exists: false });
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Recruiter not found');
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sanitizes the name, saves the lead, and emails both the recruiter and candidate', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, leadId: 'lead_1' });
    expect(mockLeadsAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateName: 'Jane &lt;Doe&gt;',
        searchedRole: 'Engineer',
        location: 'London'
      })
    );
    expect(mockMailAdd).toHaveBeenCalledTimes(2);
    expect(mockMailAdd).toHaveBeenCalledWith(expect.objectContaining({ to: 'inbox@agency.com' }));
    expect(mockMailAdd).toHaveBeenCalledWith(expect.objectContaining({ to: 'jane@example.com' }));
  });

  it('falls back to the account email and default agency name when recruiter fields are sparse', async () => {
    mockReadBody.mockResolvedValue({
      name: 'Jane',
      email: 'jane@example.com',
      recruiterId: 'rec_1'
    });
    mockRecruiterGet.mockResolvedValue({
      exists: true,
      data: () => ({ email: 'account@agency.com' })
    });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockMailAdd).toHaveBeenCalledWith(expect.objectContaining({ to: 'account@agency.com' }));
    expect(mockMailAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          subject: expect.stringContaining('Our Partner Agency')
        })
      })
    );
    expect(mockLeadsAdd).toHaveBeenCalledWith(
      expect.objectContaining({ searchedRole: 'Unknown Role', location: 'Unknown Location' })
    );
  });

  it('skips emailing the recruiter when no target email is available', async () => {
    mockRecruiterGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockMailAdd).toHaveBeenCalledTimes(1);
    expect(mockMailAdd).toHaveBeenCalledWith(expect.objectContaining({ to: 'jane@example.com' }));
  });

  it('wraps an unexpected failure in a generic 500', async () => {
    mockLeadsAdd.mockRejectedValueOnce(new Error('firestore down'));
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Internal server error processing lead');
  });
});
