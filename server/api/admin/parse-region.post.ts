import { readMultipartFormData, createError } from 'h3';
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
      // UK Regional Logic (PROV - Work Geography Table 7.7a)
      // Prioritize "Full-Time" sheet
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

      // Find header row (Description/Code)
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
        throw createError({
          statusCode: 422,
          message: 'Could not extract UK (ONS) headers from the first detected header row.'
        });
      }
      const descIdx = headers.indexOf('Description'); // Contains Location in regional files
      const codeIdx = headers.indexOf('Code');
      const medianIdx = headers.indexOf('Median');

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[descIdx]) continue;

        const location = row[descIdx].toString().trim(); // Description is Location
        const id_code = row[codeIdx]?.toString().trim();
        const salaryVal = row[medianIdx];

        // ONS uses 'x', '..', or ':' for suppressed/missing data
        if (typeof salaryVal !== 'number' || isNaN(salaryVal)) continue;

        normalizedData.push({
          title: 'All', // UK Regional tables are aggregates, so we set title to 'All'
          location,
          year: targetYear,
          salary: Math.round(salaryVal),
          country: 'UK',
          id_code,
          period: 'year'
        });
      }
    } else {
      // USA Regional Logic (State/Area files)
      if (!workbook.SheetNames[0]) {
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

      if (titleIdx === -1 || salaryIdx === -1 || locIdx === -1) {
        throw createError({
          statusCode: 422,
          message: 'Could not detect USA (BLS) header structure (OCC_TITLE/A_MEDIAN/AREA_TITLE).'
        });
      }

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[titleIdx]) continue;

        const title = row[titleIdx].toString().trim();
        const id_code = row[codeIdx]?.toString().trim();
        const location = row[locIdx].toString().trim(); // Explicitly use AREA_TITLE for location
        const salaryRaw = row[salaryIdx];

        // BLS uses '*' for missing and '#' for >$239k
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
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Internal Server Error during parsing',
      cause: error
    });
  }
});
