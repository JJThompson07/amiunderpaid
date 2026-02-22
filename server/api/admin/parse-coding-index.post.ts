import { readMultipartFormData, createError } from 'h3';
import * as XLSX from 'xlsx';

interface JobTitleRecord {
  title: string;
  soc: string;
  group: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readMultipartFormData(event);
    if (!body) throw createError({ statusCode: 400, message: 'No body' });

    const file = body.find((item) => item.name === 'file');
    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file uploaded' });
    }

    // Parse the spreadsheet buffer
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    // Find the 'SOC2020 coding index' sheet, or fallback to one containing 'coding index'
    const sheetName =
      workbook.SheetNames.find((n) => n.toLowerCase().includes('soc2020 coding index')) ||
      workbook.SheetNames.find((n) => n.toLowerCase().includes('coding index')) ||
      workbook.SheetNames[0];
    if (!sheetName) {
      throw createError({ statusCode: 400, message: 'No sheets found in the uploaded file' });
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw createError({ statusCode: 400, message: 'Could not find the data sheet' });
    }

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (!rawData || rawData.length === 0) {
      throw createError({ statusCode: 400, message: 'The file appears to be empty.' });
    }

    let headerRowIndex = -1;
    let titleIdx = -1;
    let socIdx = -1;
    let groupIdx = -1;

    // 1. Scan for Headers
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = (rawData[i] || []).map((c: any) => c?.toString().toLowerCase().trim() || '');

      // Look for "INDEXOCC" or "INDEX_TERM" for the title
      const t = row.findIndex(
        (c) => c === 'indexocc' || c.includes('index_term') || c.includes('index term')
      );

      // Look for "SOC_2020" or "SOC2020" for the code
      const s = row.findIndex((c) => c === 'soc_2020' || c === 'soc2020');

      // Look for "SOC2020_ext_SUG_title" for the group
      const g = row.findIndex((c) => c === 'soc2020_ext_sug_title' || c.includes('ext_sug_title'));

      if (t > -1 && s > -1) {
        headerRowIndex = i;
        titleIdx = t;
        socIdx = s;
        groupIdx = g;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw createError({
        statusCode: 400,
        message: 'Could not find SOC_2020 and INDEXOCC columns in the first 20 rows.'
      });
    }

    const normalizedData: JobTitleRecord[] = [];

    // 2. Extract Data
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row) continue;

      const title = row[titleIdx]?.toString().trim();
      const soc = row[socIdx]?.toString().trim();
      const group = groupIdx > -1 ? row[groupIdx]?.toString().trim() : '';

      if (title && soc) {
        normalizedData.push({
          title,
          soc,
          group: group || ''
        });
      }
    }

    return {
      success: true,
      count: normalizedData.length,
      data: normalizedData
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unknown error occurred during parsing',
      cause: error
    };
  }
});
