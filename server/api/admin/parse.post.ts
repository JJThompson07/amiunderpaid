import { readMultipartFormData, createError } from 'h3';
import * as XLSX from 'xlsx';

/**
 * Server-side parser for ONS and BLS data.
 * Handles multipart/form-data containing an Excel or CSV file.
 */

interface SalaryRecord {
  title: string;
  location: string;
  year: number;
  salary: number;
  country: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readMultipartFormData(event);
    const file = body?.find((item) => item.name === 'file');
    const country = body?.find((item) => item.name === 'country')?.data.toString() || 'UK';

    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' });
    }

    // Parse the spreadsheet buffer
    const workbook = XLSX.read(file.data, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    if (typeof sheetName !== 'string' || !sheetName || !workbook.SheetNames.includes(sheetName)) {
      throw createError({ statusCode: 400, message: 'Invalid or missing sheet name' });
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || typeof worksheet !== 'object' || !worksheet['!ref']) {
      throw createError({ statusCode: 400, message: 'Invalid or missing worksheet' });
    }

    // Convert to 2D array for fuzzy header searching
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const normalizedData: SalaryRecord[] = [];
    const currentYear = new Date().getFullYear();

    if (country === 'UK') {
      /**
       * ONS ASHE Parsing Logic
       * Searches for the row containing 'Description' or 'Occupation'
       */
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const firstCell = rawData[i]?.[0]?.toString().toLowerCase().trim();
        if (firstCell === 'description' || firstCell === 'occupation') {
          headerRowIndex = i;
          break;
        }
      }

      // If we can't find the header, fall back to the standard index 5, or fail
      const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 5;

      for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 3) continue;

        const title = row[0]?.toString().trim();
        const salaryValue = row[2]?.toString().replace(/,/g, '');
        const salary = parseFloat(salaryValue);

        if (title && !isNaN(salary) && salary > 0) {
          normalizedData.push({
            title,
            location: 'UK',
            year: currentYear,
            salary: Math.round(salary),
            country: 'UK',
          });
        }
      }
    } else {
      /**
       * BLS USA Parsing Logic
       * FUZZY HEADER DETECTION: Scans rows to find 'occ_title' and 'a_median'
       */
      let headerIdx = -1;
      let titleCol = -1;
      let salaryCol = -1;
      let locCol = -1;

      // Search through the first 25 rows to find the headers
      for (let i = 0; i < Math.min(rawData.length, 25); i++) {
        const row = (rawData[i] || []).map((c) => c?.toString().toLowerCase().trim());

        const tIdx = row.findIndex((c) => c === 'occ_title' || c === 'occupation title');
        const sIdx = row.findIndex((c) => c === 'a_median' || c === 'annual median');

        if (tIdx !== -1 && sIdx !== -1) {
          headerIdx = i;
          titleCol = tIdx;
          salaryCol = sIdx;
          locCol = row.findIndex((c) => c === 'area_title' || c === 'state');
          break;
        }
      }

      if (headerIdx === -1) {
        throw createError({
          statusCode: 400,
          message: `Invalid BLS format: Required headers (OCC_TITLE and A_MEDIAN) not found in the first 25 rows. Please check your file structure.`,
        });
      }

      // Process rows following the discovered header
      for (let i = headerIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row) continue;

        const title = row[titleCol]?.toString().trim();
        // BLS uses '*' or '#' for missing data; replace and parse
        const salaryStr = row[salaryCol]?.toString().replace(/,/g, '');
        const salary = parseFloat(salaryStr);
        const location = locCol !== -1 ? row[locCol]?.toString() : 'USA';

        if (title && !isNaN(salary) && salary > 0) {
          normalizedData.push({
            title,
            location,
            year: currentYear,
            salary: Math.round(salary),
            country: 'USA',
          });
        }
      }
    }

    return {
      success: true,
      count: normalizedData.length,
      data: normalizedData,
    };
  } catch (error: any) {
    console.error('[Parser API Error]:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during parsing',
    };
  }
});
