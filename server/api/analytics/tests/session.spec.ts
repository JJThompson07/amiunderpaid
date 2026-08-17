import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Firebase Admin SDK
const { setMock, docMock, collectionMock } = vi.hoisted(() => {
  const set = vi.fn().mockResolvedValue(true);
  const doc = vi.fn().mockReturnValue({ set });
  const collection = vi.fn().mockReturnValue({ doc });
  return { setMock: set, docMock: doc, collectionMock: collection };
});

vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn().mockReturnValue({
      collection: collectionMock,
    }),
    FieldValue: {
      increment: vi.fn((val) => `increment(${val})`),
    },
  };
});

import sessionEndpoint from '../session.post';

describe('Analytics Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process headers correctly and write to firestore', async () => {
    const event = {
      node: {
        req: {
          headers: {
            'x-vercel-ip-country': 'GB',
            'x-vercel-ip-city': 'London',
          },
        },
      },
    } as any;

    await sessionEndpoint(event);

    expect(collectionMock).toHaveBeenCalledWith('user_sessions');
    expect(docMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      {
        total: 'increment(1)',
        'locations.GB.London': 'increment(1)',
      },
      { merge: true }
    );
  });

  it('should default to Unknown if headers are missing', async () => {
    const event = {
      node: {
        req: {
          headers: {},
        },
      },
    } as any;

    await sessionEndpoint(event);

    expect(setMock).toHaveBeenCalledWith(
      {
        total: 'increment(1)',
        'locations.Unknown.Unknown': 'increment(1)',
      },
      { merge: true }
    );
  });

  it('should fallback to cf-ipcountry', async () => {
    const event = {
      node: {
        req: {
          headers: {
            'cf-ipcountry': 'US',
          },
        },
      },
    } as any;

    await sessionEndpoint(event);

    expect(setMock).toHaveBeenCalledWith(
      {
        total: 'increment(1)',
        'locations.US.Unknown': 'increment(1)',
      },
      { merge: true }
    );
  });
});
