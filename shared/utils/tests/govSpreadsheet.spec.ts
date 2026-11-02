import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { ONS_LOCATIONS } from '../../../utils/locations/uk';
import { parseGovernmentWorkbook, readGovernmentWorkbook } from '../govSpreadsheet';

// builds a workbook the way the seeder sees it: written to xlsx bytes, then read back
const workbookOf = (sheets: Record<string, unknown[][]>): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return readGovernmentWorkbook(bytes);
};

const UK_HEADERS = ['Code', 'Description', 'Median', 'Mean', '10', '25', '75', '90'];
const USA_HEADERS = [
  'OCC_TITLE',
  'AREA_TITLE',
  'A_MEDIAN',
  'A_MEAN',
  'OCC_CODE',
  'A_PCT10',
  'A_PCT25',
  'A_PCT75',
  'A_PCT90'
];

describe('parseGovernmentWorkbook', () => {
  describe('UK (ONS ASHE)', () => {
    it('national: reads Description as the job title with mean and percentiles (Table 14.7a)', () => {
      const wb = workbookOf({
        'Full-Time': [
          UK_HEADERS,
          ['2136', 'Programmers', '52,000', '55000', 30000, 38000, 65000, 80000]
        ]
      });

      const { records, skipped } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'national',
        year: 2026
      });

      expect(skipped).toBe(0);
      expect(records).toEqual([
        {
          title: 'Programmers',
          location: 'United Kingdom',
          year: 2026,
          salary: 52000,
          avg_salary: 55000,
          salary_10_pt: 30000,
          salary_25_pt: 38000,
          salary_75_pt: 65000,
          salary_90_pt: 80000,
          country: 'UK',
          id_code: '2136',
          period: 'year'
        }
      ]);
    });

    it('regional: reads Description as the location, cleaned via ONS_LOCATIONS (Table 7.7a)', () => {
      const { gov_name: govName, name: cleanName } = ONS_LOCATIONS[0]!;
      const wb = workbookOf({ 'Full-Time': [UK_HEADERS, ['E1', govName, 48000, 50000]] });

      const { records } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'regional',
        year: 2026
      });

      expect(records).toEqual([
        expect.objectContaining({ title: 'All', location: cleanName, salary: 48000 })
      ]);
    });

    it('regional: keeps the raw location when no ONS mapping exists', () => {
      const wb = workbookOf({ 'Full-Time': [UK_HEADERS, ['Z1', 'Some Unmapped Region', 40000]] });

      const { records } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'regional',
        year: 2026
      });

      expect(records[0]?.location).toBe('Some Unmapped Region');
    });

    it('prefers the Full-Time sheet over the first sheet', () => {
      const wb = workbookOf({
        All: [UK_HEADERS, ['1', 'From All Sheet', 40000]],
        'Full-Time': [UK_HEADERS, ['1', 'From Full-Time Sheet', 45000]]
      });

      const { records } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'national',
        year: 2026
      });

      expect(records.map((r) => r.title)).toEqual(['From Full-Time Sheet']);
    });

    it('falls back to the first sheet, finds a header below title rows, and skips blank rows', () => {
      const wb = workbookOf({
        Sheet1: [['ASHE Table 14.7a'], [], UK_HEADERS, ['', '', ''], ['1', 'Nurses', 36000]]
      });

      const { records, skipped } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'national',
        year: 2026
      });

      expect(records.map((r) => r.title)).toEqual(['Nurses']);
      expect(skipped).toBe(0);
    });

    it('counts suppressed (x, .., :) and sub-1,000 medians as skipped and leaves a blank code undefined', () => {
      const wb = workbookOf({
        'Full-Time': [
          ['Code', 'Description', 'Median'],
          ['   ', 'Kept', 45000],
          ['1', 'Suppressed', 'x'],
          ['2', 'Unreliable', '..'],
          ['3', 'Not available', ':'],
          ['4', 'Hourly figure', 12.5]
        ]
      });

      const { records, skipped } = parseGovernmentWorkbook(wb, {
        country: 'UK',
        scope: 'regional',
        year: 2020
      });

      expect(records).toEqual([
        expect.objectContaining({ location: 'Kept', id_code: undefined, year: 2020 })
      ]);
      expect(skipped).toBe(4);
    });

    it('rejects a sheet without the ONS header structure', () => {
      const wb = workbookOf({ 'Full-Time': [['nothing', 'recognisable']] });

      expect(() =>
        parseGovernmentWorkbook(wb, { country: 'UK', scope: 'national', year: 2026 })
      ).toThrow('Could not detect UK (ONS) header structure.');
    });

    it('rejects headers without a Median column', () => {
      const wb = workbookOf({
        'Full-Time': [
          ['Code', 'Description'],
          ['1', 'Region']
        ]
      });

      expect(() =>
        parseGovernmentWorkbook(wb, { country: 'UK', scope: 'regional', year: 2026 })
      ).toThrow('Could not detect required UK (ONS) columns (Description/Median).');
    });

    it('rejects a workbook with no sheets', () => {
      const empty = { SheetNames: [], Sheets: {} } as XLSX.WorkBook;

      expect(() =>
        parseGovernmentWorkbook(empty, { country: 'UK', scope: 'national', year: 2026 })
      ).toThrow('No sheets found in the uploaded ONS file.');
    });

    it('rejects a workbook whose named sheet is missing', () => {
      const broken = { SheetNames: ['Full-Time'], Sheets: {} } as XLSX.WorkBook;

      expect(() =>
        parseGovernmentWorkbook(broken, { country: 'UK', scope: 'national', year: 2026 })
      ).toThrow('Could not find the data sheet in the uploaded ONS file.');
    });
  });

  describe('USA (BLS OEWS)', () => {
    it.each(['national', 'regional'] as const)(
      '%s: reads OCC_TITLE/AREA_TITLE with mean, code and percentiles',
      (scope) => {
        const wb = workbookOf({
          Sheet1: [
            USA_HEADERS,
            ['Software Engineer', 'Texas', '90,000', 92000, '15-1252', 65000, 75000, 105000, 125000]
          ]
        });

        const { records } = parseGovernmentWorkbook(wb, { country: 'USA', scope, year: 2026 });

        expect(records).toEqual([
          {
            title: 'Software Engineer',
            location: 'Texas',
            year: 2026,
            salary: 90000,
            avg_salary: 92000,
            salary_10_pt: 65000,
            salary_25_pt: 75000,
            salary_75_pt: 105000,
            salary_90_pt: 125000,
            country: 'USA',
            id_code: '15-1252',
            period: 'year'
          }
        ]);
      }
    );

    it('skips blank title/location rows and counts suppressed (*, #) or unparseable medians', () => {
      const wb = workbookOf({
        Sheet1: [
          ['OCC_TITLE', 'AREA_TITLE', 'A_MEDIAN'],
          ['', 'Texas', 90000],
          ['Engineer', '', 90000],
          ['Engineer', 'Texas', '*'],
          ['Engineer', 'Utah', '#'],
          ['Engineer', 'Iowa', 'N/A'],
          ['Engineer', 'Ohio', 85000]
        ]
      });

      const { records, skipped } = parseGovernmentWorkbook(wb, {
        country: 'USA',
        scope: 'regional',
        year: 2026
      });

      expect(records).toEqual([
        expect.objectContaining({ title: 'Engineer', location: 'Ohio', id_code: undefined })
      ]);
      expect(skipped).toBe(3);
    });

    it('rejects a sheet missing the required BLS columns', () => {
      const wb = workbookOf({ Sheet1: [['SOMETHING', 'ELSE']] });

      expect(() =>
        parseGovernmentWorkbook(wb, { country: 'USA', scope: 'national', year: 2026 })
      ).toThrow('Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).');
    });

    it('rejects a workbook with no sheets', () => {
      const empty = { SheetNames: [], Sheets: {} } as XLSX.WorkBook;

      expect(() =>
        parseGovernmentWorkbook(empty, { country: 'USA', scope: 'regional', year: 2026 })
      ).toThrow('No sheets found in the uploaded BLS file.');
    });
  });
});
