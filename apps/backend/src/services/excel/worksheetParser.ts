import ExcelJS from 'exceljs';
import { ApiError } from '../../utils/apiError.js';

export interface ParsedRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

/** Reads a workbook's first sheet into header-keyed rows. Row 1 is the header; data starts at row 2. */
export async function parseWorksheet(buffer: Uint8Array): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's own .d.ts declares a broken `Buffer extends ArrayBuffer`
    // that shadows @types/node's real Buffer, so no cast satisfies this
    // parameter's declared type even though a real Buffer/Uint8Array is
    // exactly what's required at runtime (see exceljs/index.d.ts).
    // @ts-expect-error — third-party type declaration bug, not a real mismatch.
    await workbook.xlsx.load(buffer);
  } catch {
    throw ApiError.validation('Could not read the uploaded file. Is it a valid .xlsx file?');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw ApiError.validation('The uploaded file has no worksheets');
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows: ParsedRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values: Record<string, unknown> = {};
    let hasAnyValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value;
      if (value !== null && value !== undefined && value !== '') hasAnyValue = true;
      values[header] = value;
    });

    if (hasAnyValue) rows.push({ rowNumber, values });
  });

  return rows;
}

export function cellString(values: Record<string, unknown>, key: string): string {
  const value = values[key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in (value as Record<string, unknown>)) {
    return String((value as { text: unknown }).text ?? '').trim();
  }
  return String(value).trim();
}

export function cellNumber(values: Record<string, unknown>, key: string): number | undefined {
  const raw = cellString(values, key);
  if (raw === '') return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}
