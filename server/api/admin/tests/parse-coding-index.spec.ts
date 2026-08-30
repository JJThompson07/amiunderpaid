import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import * as XLSX from 'xlsx';

type ParseCodingIndexHandler = (
  event: H3Event
) => Promise<
  | { success: true; count: number; data: unknown[] }
  | { success: false; error: string; cause: unknown }
>;
type MultipartItem = { name: string; data: Buffer };

vi.stubGlobal('defineEventHandler', <T>(fn: T): T => fn);

const mockReadMultipartFormData = vi.fn();
vi.mock('h3', () => ({
  createError: (err: Partial<H3Error>) => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  },
  readMultipartFormData: mockReadMultipartFormData
}));

const bookBuffer = (rows: unknown[][], sheetName = 'SOC2020 coding index'): Buffer => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const part = (name: string, data: Buffer): MultipartItem => ({ name, data });

describe('admin parse-coding-index endpoint', () => {
  let handler: ParseCodingIndexHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../parse-coding-index.post');
    handler = mod.default as unknown as ParseCodingIndexHandler;
  });

  it('returns success: false when no request body is present', async () => {
    mockReadMultipartFormData.mockResolvedValue(null);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual(expect.objectContaining({ success: false, error: 'No body' }));
  });

  it('returns success: false when no file is uploaded', async () => {
    mockReadMultipartFormData.mockResolvedValue([]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual(expect.objectContaining({ success: false, error: 'No file uploaded' }));
  });

  it('parses the SOC2020 coding index sheet and extracts title/soc/group', async () => {
    const rows = [
      ['INDEXOCC', 'SOC_2020', 'SOC2020_EXT_SUG_TITLE'],
      ['Software Engineer', '2136', 'Programmers and software development professionals']
    ];
    mockReadMultipartFormData.mockResolvedValue([part('file', bookBuffer(rows))]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({
      success: true,
      count: 1,
      data: [
        {
          title: 'Software Engineer',
          soc: '2136',
          group: 'Programmers and software development professionals'
        }
      ]
    });
  });

  it('skips rows missing a title or SOC code', async () => {
    const rows = [
      ['INDEXOCC', 'SOC_2020'],
      ['', '2136'],
      ['Software Engineer', '']
    ];
    mockReadMultipartFormData.mockResolvedValue([part('file', bookBuffer(rows))]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual({ success: true, count: 0, data: [] });
  });

  it('returns success: false when the required header columns cannot be found', async () => {
    const rows = [['nothing', 'recognisable']];
    mockReadMultipartFormData.mockResolvedValue([part('file', bookBuffer(rows))]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res).toEqual(
      expect.objectContaining({
        success: false,
        error: 'Could not find SOC_2020 and INDEXOCC columns in the first 20 rows.'
      })
    );
  });

  it('returns success: false for an unparseable file buffer', async () => {
    mockReadMultipartFormData.mockResolvedValue([part('file', Buffer.from('not an xlsx file'))]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.success).toBe(false);
  });
});
