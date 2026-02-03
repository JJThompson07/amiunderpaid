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
  id_code?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readMultipartFormData(event);
    if (!body) throw createError({ statusCode: 400, message: 'No body' });

    const file = body.find((item) => item.name === 'file');
    // Handle country being passed as a field
    const countryPart = body.find((item) => item.name === 'country');
    const country = countryPart ? countryPart.data.toString() : 'UK';
    const yearPart = body.find((item) => item.name === 'year');
    const targetYear = yearPart ? parseInt(yearPart.data.toString()) : new Date().getFullYear();

    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' });
    }

    // Parse the spreadsheet buffer
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    // For ONS, the data is often in the 'All', 'Full-Time' or first sheet
    const sheetName =
      workbook.SheetNames.find((n) => n.includes('All') || n.includes('Full-Time')) ||
      workbook.SheetNames[0];
    if (!sheetName) {
      throw createError({ statusCode: 400, message: 'No sheets found in the uploaded file' });
    }
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw createError({ statusCode: 400, message: 'Could not find the data sheet' });
    }

    // Convert to 2D array (array of arrays) to handle offset headers easily
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!rawData || rawData.length === 0) {
      throw createError({ statusCode: 400, message: 'The file appears to be empty.' });
    }

    const normalizedData: SalaryRecord[] = [];

    if (country === 'UK') {
      /**
       * ONS ASHE Parsing Logic
       * Target: Table 14.7a (Annual pay - Gross)
       * Headers usually on row 5 (Index 4)
       * Col 0: Description
       * Col 3: Median (£)  <-- Vital: Col 2 is often 'Number of jobs'
       */
      let headerRowIndex = -1;
      const titleIdx = 0;
      let salaryIdx = 3; // Default fallback for ONS Table 14.7a
      let codeIdx = -1;

      // 1. Scan for the Header Row
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i] || [];
        // Check first few columns for 'Description'
        const firstCell = row[0]?.toString().toLowerCase().trim() || '';
        if (firstCell === 'description') {
          headerRowIndex = i;

          // Dynamically find 'Median' column in this row just in case it moved
          const foundSalaryIdx = row.findIndex(
            (c: any) => c?.toString().toLowerCase().trim() === 'median'
          );
          if (foundSalaryIdx > -1) salaryIdx = foundSalaryIdx;

          // Dynamically find 'Code' column
          const foundCodeIdx = row.findIndex(
            (c: any) => c?.toString().toLowerCase().trim() === 'code'
          );
          if (foundCodeIdx > -1) codeIdx = foundCodeIdx;

          break;
        }
      }

      // If header not found, assume row 5 (index 4) for standard ONS sheets
      const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;

      for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 2) continue;

        const title = row[titleIdx]?.toString().trim();
        const id_code = codeIdx > -1 ? row[codeIdx]?.toString().trim() : undefined;

        // ONS data cleaning:
        // - "x" means unreliable/unavailable
        // - ":" means not applicable
        let salaryRaw = row[salaryIdx];

        if (typeof salaryRaw === 'string') {
          // Remove commas if present "32,890"
          salaryRaw = salaryRaw.replace(/,/g, '');
        }

        const salary = parseFloat(salaryRaw);

        // Filter out bad data rows (summaries, empty lines, or 'x' values)
        if (title && !isNaN(salary) && salary > 1000) {
          // ONS titles sometimes have footnotes like "1" attached, though usually separate columns
          // We can clean common prefixes if needed, but usually raw description is fine
          normalizedData.push({
            title,
            location: 'UK', // ONS Table 14 is National. Table 15 is Regional.
            year: targetYear,
            salary: Math.round(salary),
            country: 'UK',
            id_code,
          });
        }
      }
    } else {
      /**
       * BLS USA Parsing Logic
       * Targeted at OEWS National CSVs
       * Look for 'OCC_TITLE' and 'A_MEDIAN' (Annual Median)
       */
      let headerRowIndex = -1;
      let titleIdx = -1;
      let salaryIdx = -1;
      let locIdx = -1;
      let codeIdx = -1;

      // 1. Scan for Headers
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = (rawData[i] || []).map((c: any) => c?.toString().toLowerCase().trim() || '');

        // Look for OCC_TITLE (Job Title) and A_MEDIAN (Annual Median Salary)
        const t = row.indexOf('occ_title');
        const c = row.indexOf('occ_code');
        const s = row.indexOf('a_median'); // Annual Median

        if (t > -1 && s > -1) {
          headerRowIndex = i;
          titleIdx = t;
          if (c > -1) codeIdx = c;
          salaryIdx = s;
          // Optional: State/Area
          const l = row.findIndex((c: string) => c === 'area_title' || c === 'state');
          if (l > -1) locIdx = l;
          break;
        }
      }

      if (headerRowIndex === -1) {
        // Fallback logic if headers aren't found in first 20 rows
        throw createError({
          statusCode: 400,
          message:
            'Could not find OCC_TITLE and A_MEDIAN headers in USA file. Also looking for OCC_CODE.',
        });
      }

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row) continue;

        const title = row[titleIdx]?.toString().trim();
        const id_code = codeIdx > -1 ? row[codeIdx]?.toString().trim() : undefined;
        let salaryRaw = row[salaryIdx];

        // BLS uses '*' for missing, '#' for >$208k (sometimes)
        if (salaryRaw === '*' || salaryRaw === '#') continue;

        if (typeof salaryRaw === 'string') {
          salaryRaw = salaryRaw.replace(/,/g, '');
        }

        const salary = parseFloat(salaryRaw);
        const location = locIdx > -1 ? row[locIdx]?.toString().trim() : 'USA';

        // Filter out "All Occupations" summary if desired, though useful context
        if (title && !isNaN(salary) && salary > 1000) {
          normalizedData.push({
            title,
            location,
            year: targetYear,
            salary: Math.round(salary),
            country: 'USA',
            id_code,
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
