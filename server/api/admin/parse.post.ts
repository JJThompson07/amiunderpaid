import { readMultipartFormData, createError } from 'h3';
import * as XLSX from 'xlsx';

/**
 * Enhanced Server-side parser for ONS (UK) and BLS (USA) employment data.
 * Designed to handle the multi-row headers of ONS ASHE and the flat CSV of BLS OEWS.
 * This version focuses strictly on annual (yearly) salary data.
 */

interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number;
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
      // We prioritize the "Full-Time" sheet if it exists for annual pay.
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

      // Fix for ONS files: Force range recalculation by removing the explicit range metadata.
      // Government files often have malformed ranges (e.g. claiming data is only A1:A1).
      // if (sheet['!ref']) {
      //   delete sheet['!ref'];
      // }

      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // ONS files have metadata rows at the top. We look for the row containing "Description" and "Code"
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

      const titleIdx = headers.indexOf('Description');
      const codeIdx = headers.indexOf('Code');
      const medianIdx = headers.indexOf('Median');

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[titleIdx]) continue;

        const title = row[titleIdx].toString().trim();
        const id_code = row[codeIdx]?.toString().trim();
        const salaryVal = row[medianIdx];

        // ONS uses 'x', '..', or ':' for suppressed/missing data
        if (typeof salaryVal !== 'number' || isNaN(salaryVal)) continue;

        // Filter out non-annual data (e.g. hourly/weekly) if mixed in or wrong file uploaded
        if (salaryVal < 1000) continue;

        normalizedData.push({
          title,
          location: 'United Kingdom',
          year: targetYear,
          salary: Math.round(salaryVal),
          country: 'UK',
          id_code,
          period: 'year'
        });
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
      const codeIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'OCC_CODE');
      const locIdx = headers.findIndex((h) => h?.toString().toUpperCase() === 'AREA_TITLE');

      if (titleIdx === -1 || salaryIdx === -1) {
        throw createError({
          statusCode: 422,
          message: 'Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN).'
        });
      }

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[titleIdx]) continue;

        const title = row[titleIdx].toString().trim();
        const id_code = row[codeIdx]?.toString().trim();
        const location = locIdx > -1 ? row[locIdx]?.toString().trim() : 'USA';
        const salaryRaw = row[salaryIdx];

        // BLS uses '*' for missing and '#' for >$239k. We skip '*' and treat '#' as the cap or skip.
        if (salaryRaw === '*' || salaryRaw === '#') continue;

        const salary =
          typeof salaryRaw === 'string'
            ? parseFloat(salaryRaw.replace(/,/g, ''))
            : parseFloat(salaryRaw);

        if (!isNaN(salary)) {
          normalizedData.push({
            title,
            location,
            year: targetYear,
            salary: Math.round(salary),
            country: 'USA',
            id_code,
            period: 'year'
          });
        }
      }
    }

    return {
      success: true,
      count: normalizedData.length,
      data: normalizedData
    };
  } catch (error: any) {
    console.error('[Parser API Error]:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error during parsing'
    });
  }
});
