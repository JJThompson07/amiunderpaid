import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { H3Event } from 'h3';
import { verifyAdmin } from '../../utils/firebase';

vi.stubGlobal('defineEventHandler', (fn: any) => fn);
vi.stubGlobal('getRequestURL', (event: any) => new URL(event.path, 'http://localhost'));

vi.mock('../../utils/firebase', () => ({
  verifyAdmin: vi.fn(),
}));

describe('Admin Guard Middleware', () => {
  let handler: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../admin-guard');
    handler = mod.default;
  });

  it('should call verifyAdmin for /api/admin/ routes', async () => {
    const event = { path: '/api/admin/users' } as unknown as H3Event;
    
    await handler(event);
    
    expect(verifyAdmin).toHaveBeenCalledWith(event);
  });

  it('should NOT call verifyAdmin for non-admin routes', async () => {
    const event = { path: '/api/user/profile' } as unknown as H3Event;
    
    await handler(event);
    
    expect(verifyAdmin).not.toHaveBeenCalled();
  });

  it('should NOT call verifyAdmin for non-api routes', async () => {
    const event = { path: '/admin/dashboard' } as unknown as H3Event;
    
    await handler(event);
    
    expect(verifyAdmin).not.toHaveBeenCalled();
  });

  it('should throw if verifyAdmin throws', async () => {
    const event = { path: '/api/admin/settings' } as unknown as H3Event;
    
    const error = new Error('Forbidden');
    (verifyAdmin as any).mockRejectedValueOnce(error);

    await expect(handler(event)).rejects.toThrow('Forbidden');
  });
});
