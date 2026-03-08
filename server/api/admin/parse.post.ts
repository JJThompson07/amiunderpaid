import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import * as XLSX from 'xlsx';

/**
 * Server-side parser for Regional/State employment data.
 * * UK Source: ONS ASHE Work Geography Table 7.7a
 * - 'Description' column = Location Name
 * - Job Title defaults to 'All' (as these tables are aggregates)
 * * USA Source: BLS OEWS State/Area data
 * - 'AREA_TITLE' column = Location Name
 * - 'OCC_TITLE' column = Job Title
 */

interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number; // This represents the median
  avg_salary?: number; // Added for mean/average salary
  salary_10_pt?: number; // 10th percentile
  salary_25_pt?: number; // 25th percentile
  salary_75_pt?: number; // 75th percentile
  salary_90_pt?: number; // 90th percentile
  country: string;
  id_code?: string;
  period: string; // Fixed to 'year'
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readMultipartFormData(event);
    if (!body) throw createError({ statusCode: 400, message: 'Invalid request body' });

    const file = body.find((item) => item.name === 'file');
    const countryPart = body.find((item) => item.name === 'country');
    const country = countryPart ? countryPart.data.toString().toUpperCase() : 'UK';
    const yearPart = body.find((item) => item.name === 'year');
    const targetYear = yearPart ? parseInt(yearPart.data.toString()) : 2025;

    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' });
    }

    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const normalizedData: SalaryRecord[] = [];

    if (country === 'UK') {
      // ONS ASHE usually has multiple sheets (All, Male, Female, Full-Time, etc.)
      const sheetName =
        workbook.SheetNames.find((s) => s.includes('Full-Time')) || workbook.SheetNames[0];
      if (!sheetName) {
        throw createError({
          statusCode: 422,
          message: 'No sheets found in the uploaded ONS file.'
        });
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw createError({
          statusCode: 422,
          message: 'Could not find the data sheet in the uploaded ONS file.'
        });
      }

      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        if (rawData[i]?.includes('Description') && rawData[i]?.includes('Code')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw createError({
          statusCode: 422,
          message: 'Could not detect UK (ONS) header structure.'
        });
      }

      const headers = rawData[headerRowIndex];

      if (!headers) {
        throw createError({ statusCode: 422, message: 'Could not detect UK (ONS) headers.' });
      }

      const locIdx = headers.indexOf('Description'); // UK Region data uses Description for Location
      const codeIdx = headers.indexOf('Code');
      const medianIdx = headers.indexOf('Median');
      const meanIdx = headers.indexOf('Mean');

      if (locIdx === -1 || medianIdx === -1) {
        throw createError({
          statusCode: 422,
          message: 'Could not detect required UK (ONS) columns (Description/Median).'
        });
      }

      // Percentile Columns
      const pct10Idx = headers.findIndex((h) => h?.toString().trim() === '10');
      const pct25Idx = headers.findIndex((h) => h?.toString().trim() === '25');
      const pct75Idx = headers.findIndex((h) => h?.toString().trim() === '75');
      const pct90Idx = headers.findIndex((h) => h?.toString().trim() === '90');

      // Helper to strictly validate UK numeric values (handles null, undefined, strings, and missing data chars)
      const parseUKVal = (val: any) => {
        if (val == null || val === 'x' || val === '..' || val === ':') return undefined;
        const parsed =
          typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
        if (!isNaN(parsed) && parsed >= 1000) return Math.round(parsed);
        return undefined;
      };

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];

        // Safely check if row exists and the location column actually has data
        if (!row || row[locIdx] == null || String(row[locIdx]).trim() === '') continue;

        const location = String(row[locIdx]).trim();
        const id_code =
          codeIdx > -1 && row[codeIdx] != null ? String(row[codeIdx]).trim() : undefined;

        const salaryVal = parseUKVal(row[medianIdx]);
        if (salaryVal === undefined) continue;

        const record: SalaryRecord = {
          title: 'All', // Region aggregates default to 'All'
          location,
          year: targetYear,
          salary: salaryVal,
          country: 'UK',
          id_code,
          period: 'year'
        };

        const meanVal = parseUKVal(meanIdx > -1 ? row[meanIdx] : undefined);
        if (meanVal) record.avg_salary = meanVal;

        const p10 = parseUKVal(pct10Idx > -1 ? row[pct10Idx] : undefined);
        const p25 = parseUKVal(pct25Idx > -1 ? row[pct25Idx] : undefined);
        const p75 = parseUKVal(pct75Idx > -1 ? row[pct75Idx] : undefined);
        const p90 = parseUKVal(pct90Idx > -1 ? row[pct90Idx] : undefined);

        if (p10) record.salary_10_pt = p10;
        if (p25) record.salary_25_pt = p25;
        if (p75) record.salary_75_pt = p75;
        if (p90) record.salary_90_pt = p90;

        normalizedData.push(record);
      }
    } else {
      // USA (BLS OEWS) Logic
      if (workbook.SheetNames[0] === undefined) {
        throw createError({
          statusCode: 422,
          message: 'No sheets found in the uploaded BLS file.'
        });
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        throw createError({
          statusCode: 422,
          message: 'Could not find the data sheet in the uploaded BLS file.'
        });
      }

      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const headers = rawData[0] || [];

      const titleIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'OCC_TITLE');
      const salaryIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_MEDIAN');
      const meanIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_MEAN');
      const codeIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'OCC_CODE');
      const locIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'AREA_TITLE');

      // Percentile Columns
      const pct10Idx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_PCT10');
      const pct25Idx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_PCT25');
      const pct75Idx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_PCT75');
      const pct90Idx = headers.findIndex((h) => h?.toString().toUpperCase() === 'A_PCT90');

      if (titleIdx === -1 || salaryIdx === -1 || locIdx === -1) {
        throw createError({
          statusCode: 422,
          message: 'Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).'
        });
      }

      // Helper to clean BLS numeric strings and handle suppression (*, #, null, undefined)
      const parseUSVal = (val: any) => {
        if (val == null || val === '*' || val === '#') return undefined;
        const parsed =
          typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
        if (!isNaN(parsed)) return Math.round(parsed);
        return undefined;
      };

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];

        // Ensure the row exists and both Title and Location cells have non-null string data
        if (!row || row[titleIdx] == null || String(row[titleIdx]).trim() === '') continue;
        if (row[locIdx] == null || String(row[locIdx]).trim() === '') continue;

        const title = String(row[titleIdx]).trim();
        const location = String(row[locIdx]).trim(); // Explicitly use AREA_TITLE for location
        const id_code =
          codeIdx > -1 && row[codeIdx] != null ? String(row[codeIdx]).trim() : undefined;

        const salaryVal = parseUSVal(row[salaryIdx]);
        if (salaryVal === undefined) continue;

        const record: SalaryRecord = {
          title,
          location,
          year: targetYear,
          salary: salaryVal,
          country: 'USA',
          id_code,
          period: 'year'
        };

        const meanVal = parseUSVal(meanIdx > -1 ? row[meanIdx] : undefined);
        if (meanVal) record.avg_salary = meanVal;

        const p10 = parseUSVal(pct10Idx > -1 ? row[pct10Idx] : undefined);
        const p25 = parseUSVal(pct25Idx > -1 ? row[pct25Idx] : undefined);
        const p75 = parseUSVal(pct75Idx > -1 ? row[pct75Idx] : undefined);
        const p90 = parseUSVal(pct90Idx > -1 ? row[pct90Idx] : undefined);

        if (p10) record.salary_10_pt = p10;
        if (p25) record.salary_25_pt = p25;
        if (p75) record.salary_75_pt = p75;
        if (p90) record.salary_90_pt = p90;

        normalizedData.push(record);
      }
    }

    return {
      success: true,
      count: normalizedData.length,
      data: normalizedData
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error during parsing',
      cause: error
    });
  }
});
