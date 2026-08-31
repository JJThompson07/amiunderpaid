import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Error, H3Event } from 'h3';
import * as XLSX from 'xlsx';
import { ONS_LOCATIONS } from '../../../../utils/locations/uk';

type ParseRegionHandler = (
  event: H3Event
) => Promise<{ success: boolean; count: number; data: unknown[] }>;
type MultipartItem = { name: string; data: Buffer };

const mockReadMultipartFormData = vi.fn();
vi.mock('h3', () => ({
  defineEventHandler: <T>(fn: T): T => fn,
  createError: (err: Partial<H3Error>): Error => {
    const e = new Error(err.message) as Error & { statusCode?: number };
    e.statusCode = err.statusCode;
    return e;
  },
  isError: (e: unknown): boolean => e instanceof Error && 'statusCode' in e,
  readMultipartFormData: mockReadMultipartFormData
}));

const bookBuffer = (rows: unknown[][], sheetName = 'Full-Time'): Buffer => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

const part = (name: string, value: string): MultipartItem => ({ name, data: Buffer.from(value) });

describe('admin parse-region endpoint', () => {
  let handler: ParseRegionHandler;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();
    const mod = await import('../parse-region.post');
    handler = mod.default as unknown as ParseRegionHandler;
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

  it('parses a UK regional sheet and cleans the location via ONS_LOCATIONS', async () => {
    const govName = ONS_LOCATIONS[0]!.gov_name;
    const cleanedName = ONS_LOCATIONS[0]!.name;
    const rows = [
      ['Code', 'Description', 'Median', 'Mean', '10', '25', '75', '90'],
      ['E1', govName, '48000', '50000', '', '', '', '']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.success).toBe(true);
    expect(res.data).toEqual([
      expect.objectContaining({
        title: 'All',
        location: cleanedName,
        country: 'UK',
        salary: 48000,
        avg_salary: 50000
      })
    ]);
  });

  it('falls back to the raw location string when no ONS mapping exists', async () => {
    const rows = [
      ['Code', 'Description', 'Median'],
      ['Z1', 'Some Unmapped Region', '40000']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.data).toEqual([expect.objectContaining({ location: 'Some Unmapped Region' })]);
  });

  it('parses a USA regional (BLS) sheet with percentile columns', async () => {
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
        'Texas',
        '90000',
        '92000',
        '15-1252',
        '65000',
        '75000',
        '105000',
        '125000'
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
      expect.objectContaining({ title: 'Software Engineer', location: 'Texas', country: 'USA' })
    ]);
  });

  it('defaults country to UK, falls back to the first sheet, and parses numeric cells with full percentiles', async () => {
    const rows = [
      ['Code', 'Description', 'Median', 'Mean', '10', '25', '75', '90'],
      ['', '', '', '', '', '', '', ''],
      ['E2', 'Region Two', 48000, 50000, 30000, 35000, 60000, 70000]
    ];
    mockReadMultipartFormData.mockResolvedValue([
      { name: 'file', data: bookBuffer(rows, 'Sheet1') }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({
        country: 'UK',
        location: 'Region Two',
        salary: 48000,
        avg_salary: 50000,
        salary_10_pt: 30000,
        salary_25_pt: 35000,
        salary_75_pt: 60000,
        salary_90_pt: 70000,
        id_code: 'E2'
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

  it('parses a UK row with a blank Code cell, skips an invalid Median marker row, and honors an explicit year', async () => {
    const rows = [
      ['Code', 'Description', 'Median'],
      [undefined, 'Region A', 45000],
      ['E9', 'Region B', 'x']
    ];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      part('year', '2020'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    const res = await handler(event);

    expect(res.count).toBe(1);
    expect(res.data).toEqual([
      expect.objectContaining({ location: 'Region A', id_code: undefined, year: 2020 })
    ]);
  });

  it('parses a sparse USA sheet: blank title/location rows and an unparseable median are skipped', async () => {
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

  it('wraps a non-Error, non-H3Error failure in an opaque 500', async () => {
    mockReadMultipartFormData.mockRejectedValue('boom');
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Internal Server Error during parsing');
  });

  it('rejects a UK sheet missing the ONS header structure', async () => {
    const rows = [['nothing', 'recognisable']];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'UK'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow('Could not detect UK (ONS) header structure.');
  });

  it('rejects a USA sheet missing required BLS columns', async () => {
    const rows = [['SOMETHING', 'ELSE']];
    mockReadMultipartFormData.mockResolvedValue([
      part('country', 'USA'),
      { name: 'file', data: bookBuffer(rows) }
    ]);
    const event = {} as unknown as H3Event;

    await expect(handler(event)).rejects.toThrow(
      'Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).'
    );
  });
});
