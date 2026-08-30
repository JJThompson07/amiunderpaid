import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import * as XLSX from 'xlsx';

type ParseHandler = (
  event: H3Event
) => Promise<{ success: boolean; count: number; data: unknown[] }>;
type MultipartItem = { name: string; data: Buffer };

const mockReadMultipartFormData = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  createError: (err: Partial<H3Error>) => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  },
  isError: (e: unknown) => e instanceof Error && 'statusCode' in e,
  readMultipartFormData: mockReadMultipartFormData
}));

const bookBuffer = (rows: unknown[][], sheetName = 'Full-Time'): Buffer => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const part = (name: string, value: string): MultipartItem => ({ name, data: Buffer.from(value) });

describe('admin parse (salary regional) endpoint', () => {
  let handler: ParseHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../parse.post');
    handler = mod.default as unknown as ParseHandler;
  });

  it('rejects a missing request body', async () => {
    mockReadMultipartFormData.mockResolvedValue(null);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Invalid request body');
  });

  it('rejects a request with no file uploaded', async () => {
    mockReadMultipartFormData.mockResolvedValue([part('country', 'UK')]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('No file uploaded');
  });

  it('parses a UK (ONS) sheet, including percentile columns and mean', async () => {
    const rows = [
      ['ignored header noise'],
      ['Code', 'Description', 'Median', 'Mean', '10', '25', '75', '90'],
      ['1', 'Software Engineer', '50000', '52000', '40000', '45000', '60000', '70000'],
      ['2', '', '30000', '', '', '', '', ''] // blank description -> skipped
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({
        title: 'Software Engineer',
        location: 'United Kingdom',
        country: 'UK',
        salary: 50000,
        avg_salary: 52000,
        salary_10_pt: 40000,
        salary_25_pt: 45000,
        salary_75_pt: 60000,
        salary_90_pt: 70000
      })
    ]);
  });

  it('parses a USA (BLS) sheet using the default year when unspecified', async () => {
    const rows = [
      [
        'OCC_TITLE',
        'AREA_TITLE',
        'A_MEDIAN',
        'A_MEAN',
        'OCC_CODE',
        'A_PCT10',
        'A_PCT25',
        'A_PCT75',
        'A_PCT90'
      ],
      [
        'Software Engineer',
        'California',
        '95000',
        '98000',
        '15-1252',
        '70000',
        '80000',
        '110000',
        '130000'
      ]
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'USA'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({
        title: 'Software Engineer',
        location: 'California',
        country: 'USA',
        salary: 95000,
        year: 2025
      })
    ]);
  });

  it('defaults country to UK, falls back to the first sheet, parses numeric cells, honors an explicit year, and skips a sub-1000 median', async () => {
    const rows = [
      ['Code', 'Description', 'Median'],
      [undefined, 'Sparse Title', 500],
      ['E2', 'Numeric Title', 48000]
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('year', '2020'),
      { name: 'file', data: bookBuffer(rows, 'Sheet1') }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({
        title: 'Numeric Title',
        country: 'UK',
        location: 'United Kingdom',
        salary: 48000,
        year: 2020,
        id_code: 'E2'
      })
    ]);
  });

  it('parses a sparse USA sheet: numeric median, missing code/percentile columns, and blank/unparseable rows skipped', async () => {
    const rows = [
      ['OCC_TITLE', 'AREA_TITLE', 'A_MEDIAN'],
      ['', 'Texas', 90000],
      ['Engineer', '', 90000],
      ['Engineer', 'Texas', 'N/A'],
      ['Engineer', 'Ohio', 85000]
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'USA'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({
        title: 'Engineer',
        location: 'Ohio',
        salary: 85000,
        id_code: undefined
      })
    ]);
  });

  it('rejects a UK sheet with headers but no Median column', async () => {
    const rows = [
      ['Code', 'Description'],
      ['E1', 'Region']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Could not detect required UK (ONS) columns (Description/Median).'
    );
  });

  it('wraps a non-Error, non-H3Error failure in an opaque 500', async () => {
    mockReadMultipartFormData.mockRejectedValue('boom');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Internal Server Error during parsing');
  });

  it('rejects a UK sheet missing the ONS header structure', async () => {
    const rows = [
      ['nothing', 'recognisable'],
      ['still', 'nothing']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Could not detect UK (ONS) header structure.');
  });

  it('rejects a USA sheet missing required BLS columns', async () => {
    const rows = [
      ['SOMETHING', 'ELSE'],
      ['a', 'b']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'USA'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).'
    );
  });

  it('returns a generic 500 for an unparseable file buffer', async () => {
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: Buffer.from('not an xlsx file') }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow();
  });
});
