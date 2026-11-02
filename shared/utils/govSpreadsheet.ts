import * as XLSX from 'xlsx';
import { ONS_LOCATIONS } from '../../utils/locations/uk';

// ==========================================
// 🏛️ GOVERNMENT SALARY SPREADSHEETS
// ==========================================
// Parses the official spreadsheets the admin seeder uploads. Runs in the browser so the
// (multi-MB) files never cross the network.
// * UK national: ONS ASHE Table 14.7a — 'Description' = job title, location 'United Kingdom'
// * UK regional: ONS ASHE Table 7.7a — 'Description' = location, title 'All'
// * USA (both): BLS OEWS — 'OCC_TITLE' = job title, 'AREA_TITLE' = location

// A raw spreadsheet cell as produced by XLSX.utils.sheet_to_json({ header: 1 })
type SheetCell = string | number | boolean | Date | null | undefined;
type SheetRow = SheetCell[];

export type GovSalaryRecord = {
  title: string;
  location: string;
  year: number;
  salary: number; // median
  avg_salary?: number;
  salary_10_pt?: number;
  salary_25_pt?: number;
  salary_75_pt?: number;
  salary_90_pt?: number;
  country: string;
  id_code?: string;
  period: string; // always 'year'
};

export type GovParseOptions = {
  country: 'UK' | 'USA';
  scope: 'national' | 'regional';
  year: number;
};

export type GovParseResult = {
  records: GovSalaryRecord[];
  // data rows dropped because their median was suppressed or missing
  skipped: number;
};

const pickSheet = (workbook: XLSX.WorkBook, source: string, preferred?: string): SheetRow[] => {
  const sheetName =
    (preferred && workbook.SheetNames.find((s) => s.includes(preferred))) || workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`No sheets found in the uploaded ${source} file.`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Could not find the data sheet in the uploaded ${source} file.`);
  }
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1 });
};

// ONS marks suppressed or unreliable estimates with x, .. or :, and anything under 1,000 is not
// an annual salary
const parseUKVal = (val: SheetCell): number | undefined => {
  if (val == null || val === 'x' || val === '..' || val === ':') {
    return undefined;
  }
  const parsed =
    typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(String(val));
  return !isNaN(parsed) && parsed >= 1000 ? Math.round(parsed) : undefined;
};

// BLS marks suppressed estimates with * and top-coded ones with #
const parseUSVal = (val: SheetCell): number | undefined => {
  if (val == null || val === '*' || val === '#') {
    return undefined;
  }
  const parsed =
    typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(String(val));
  return !isNaN(parsed) ? Math.round(parsed) : undefined;
};

// ONS 2026 tables store codes as text with a literal leading apostrophe ('2134, 'E12000003);
// strip it so codes match job_titles SOC codes and the site's id_code lookups
const parseCode = (val: SheetCell): string | undefined => {
  const code = val == null ? '' : String(val).trim().replace(/^'+/, '').trim();
  return code === '' ? undefined : code;
};

const isBlank = (val: SheetCell): boolean => val == null || String(val).trim() === '';

type Columns = {
  median: number;
  mean: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
};

const addOptionalFields = (
  record: GovSalaryRecord,
  row: SheetRow,
  cols: Columns,
  parseVal: (val: SheetCell) => number | undefined
): GovSalaryRecord => {
  const at = (idx: number): number | undefined =>
    parseVal(idx > -1 ? row[idx] : undefined) || undefined;
  const fields = {
    avg_salary: at(cols.mean),
    salary_10_pt: at(cols.p10),
    salary_25_pt: at(cols.p25),
    salary_75_pt: at(cols.p75),
    salary_90_pt: at(cols.p90)
  };
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      record[key as keyof typeof fields] = value;
    }
  }
  return record;
};

const parseUK = (workbook: XLSX.WorkBook, { scope, year }: GovParseOptions): GovParseResult => {
  // ONS ASHE has multiple sheets (All, Male, Female, Full-Time, ...)
  const rows = pickSheet(workbook, 'ONS', 'Full-Time');

  const headerRowIndex = rows
    .slice(0, 10)
    .findIndex((row) => row?.includes('Description') && row?.includes('Code'));
  if (headerRowIndex === -1) {
    throw new Error('Could not detect UK (ONS) header structure.');
  }
  const headers = rows[headerRowIndex] ?? [];
  const pct = (label: string): number =>
    headers.findIndex((h) => h != null && String(h).trim() === label);

  const descIdx = headers.indexOf('Description');
  const codeIdx = headers.indexOf('Code');
  const cols: Columns = {
    median: headers.indexOf('Median'),
    mean: headers.indexOf('Mean'),
    p10: pct('10'),
    p25: pct('25'),
    p75: pct('75'),
    p90: pct('90')
  };
  if (cols.median === -1) {
    throw new Error('Could not detect required UK (ONS) columns (Description/Median).');
  }

  const cleanNameMap = new Map(ONS_LOCATIONS.map((loc) => [loc.gov_name, loc.name]));
  const records: GovSalaryRecord[] = [];
  let skipped = 0;

  for (const row of rows.slice(headerRowIndex + 1)) {
    if (!row || isBlank(row[descIdx])) {
      continue;
    }
    const salary = parseUKVal(row[cols.median]);
    if (salary === undefined) {
      skipped++;
      continue;
    }

    const description = String(row[descIdx]).trim();
    const record: GovSalaryRecord =
      scope === 'national'
        ? {
            title: description,
            location: 'United Kingdom',
            year,
            salary,
            country: 'UK',
            period: 'year'
          }
        : {
            title: 'All', // regional tables are aggregates across occupations
            location: cleanNameMap.get(description) || description,
            year,
            salary,
            country: 'UK',
            period: 'year'
          };
    record.id_code = codeIdx > -1 ? parseCode(row[codeIdx]) : undefined;

    records.push(addOptionalFields(record, row, cols, parseUKVal));
  }

  return { records, skipped };
};

const parseUSA = (workbook: XLSX.WorkBook, { year }: GovParseOptions): GovParseResult => {
  const rows = pickSheet(workbook, 'BLS');
  const headers = rows[0] || [];
  const col = (name: string): number =>
    headers.findIndex((h) => h != null && String(h).toUpperCase() === name);

  const titleIdx = col('OCC_TITLE');
  const locIdx = col('AREA_TITLE');
  const codeIdx = col('OCC_CODE');
  const cols: Columns = {
    median: col('A_MEDIAN'),
    mean: col('A_MEAN'),
    p10: col('A_PCT10'),
    p25: col('A_PCT25'),
    p75: col('A_PCT75'),
    p90: col('A_PCT90')
  };
  if (titleIdx === -1 || cols.median === -1 || locIdx === -1) {
    throw new Error('Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).');
  }

  const records: GovSalaryRecord[] = [];
  let skipped = 0;

  for (const row of rows.slice(1)) {
    if (!row || isBlank(row[titleIdx]) || isBlank(row[locIdx])) {
      continue;
    }
    const salary = parseUSVal(row[cols.median]);
    if (salary === undefined) {
      skipped++;
      continue;
    }

    const record: GovSalaryRecord = {
      title: String(row[titleIdx]).trim(),
      location: String(row[locIdx]).trim(),
      year,
      salary,
      country: 'USA',
      id_code: codeIdx > -1 ? parseCode(row[codeIdx]) : undefined,
      period: 'year'
    };
    records.push(addOptionalFields(record, row, cols, parseUSVal));
  }

  return { records, skipped };
};

export const parseGovernmentWorkbook = (
  workbook: XLSX.WorkBook,
  options: GovParseOptions
): GovParseResult =>
  options.country === 'UK' ? parseUK(workbook, options) : parseUSA(workbook, options);

// sheet_to_json only reads raw cell values, so skip building formula, HTML and formatted-text
// strings for every cell: the BLS state/area workbook has over a million cells
export const readGovernmentWorkbook = (data: ArrayBuffer): XLSX.WorkBook =>
  XLSX.read(data, { type: 'array', cellFormula: false, cellHTML: false, cellText: false });
