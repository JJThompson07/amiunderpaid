import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';

type ContactSettingsHandler = (event: H3Event) => Promise<{ success: boolean }>;

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);
vi.stubGlobal('createError', (err: Partial<H3Error>) => {
  const e = new Error(err.message) as Error & { statusCode?: number };
  e.statusCode = err.statusCode;
  return e;
});
vi.stubGlobal('getRequestHeader', () => mockAuthHeader);

let mockAuthHeader: string | undefined;
const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken }))
}));

const mockReadBody = vi.fn();
vi.stubGlobal('readBody', mockReadBody);

const mockSet = vi.fn();
const mockCollection = vi.fn(() => ({ doc: vi.fn(() => ({ set: mockSet })) }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({ collection: mockCollection }))
}));

describe('user recruiter/contact-settings endpoint', () => {
  let handler: ContactSettingsHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../contact-settings.post');
    handler = mod.default as unknown as ContactSettingsHandler;

    mockAuthHeader = 'Bearer valid-token';
    mockVerifyIdToken.mockResolvedValue({ uid: 'rec_1' });
    mockReadBody.mockResolvedValue({
      title: 'Get in touch',
      content: 'We can help',
      buttonText: 'Contact us',
      brandBgColour: '#000000',
      brandTextColour: '#ffffff',
      categoryContent: { engineering: 'Engineering roles' },
      logoUrl: 'https://example.com/logo.png'
    });
    mockSet.mockResolvedValue(undefined);
  });

  it('rejects without a Bearer token', async () => {
    mockAuthHeader = undefined;
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Unauthorized');
  });

  it('saves the provided contact settings for the authenticated recruiter', async () => {
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true });
    expect(mockCollection).toHaveBeenCalledWith('recruiter_contact_settings');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        recruiterId: 'rec_1',
        title: 'Get in touch',
        brandBgColour: '#000000',
        categoryContent: { engineering: 'Engineering roles' }
      }),
      { merge: true }
    );
  });

  it('applies default values when optional fields are omitted', async () => {
    mockReadBody.mockResolvedValue({});
    const event = {} as unknown as H3Event;

    await handler(event);

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '',
        content: '',
        buttonText: '',
        brandBgColour: '#4f46e5',
        brandTextColour: '#ffffff',
        categoryContent: {},
        logoUrl: ''
      }),
      { merge: true }
    );
  });
});
