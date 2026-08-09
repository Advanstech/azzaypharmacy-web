'use client';

/**
 * Shared, well-formatted Excel (.xlsx) export utility for Admin Reports.
 *
 * Produces a workbook with:
 *  - A bold title row (merged across the table width)
 *  - Meta info rows (Branch, Period, Generated timestamp, etc.)
 *  - An optional KPI/summary block
 *  - A styled, bold header row for the data table
 *  - Auto-sized columns, currency/number formatting, and a frozen header row
 */

import * as XLSX from 'xlsx-js-style';

export interface ExcelMetaRow {
  label: string;
  value: string | number;
}

export interface ExcelExportOptions {
  /** File name WITHOUT extension, e.g. "stock-level-report-2026-07-19" */
  filename: string;
  /** Report title, shown as a large bold header at the top */
  title: string;
  /** Optional subtitle shown under the title */
  subtitle?: string;
  /** Meta info rows e.g. Branch, Period, Generated At */
  meta?: ExcelMetaRow[];
  /** Optional KPI/summary rows shown in a highlighted block before the table */
  summary?: ExcelMetaRow[];
  /** Table column headers */
  headers: string[];
  /** Table rows — must match headers length */
  rows: (string | number | null | undefined)[][];
  /** 0-based column indices that should be formatted as GH₵ currency */
  currencyColumns?: number[];
  /** 0-based column indices that should be formatted as plain numbers */
  numberColumns?: number[];
  /** 0-based column indices that should be formatted as percentages (value already *100, e.g. 12.5 => 12.5%) */
  percentColumns?: number[];
  /** Sheet name (defaults to "Report") */
  sheetName?: string;
  /** Optional row indices (relative to `rows`, 0-based) to render as bold "total" rows */
  totalRowIndices?: number[];
  /** 0-based column index for status labels (OK/LOW/OUT OF STOCK) to color-code cells */
  statusColumn?: number;
}

const HEADER_FILL = 'FF0EA5E9';
const TOTAL_FILL = 'FFE0F2FE';
const TITLE_FONT_COLOR = 'FF0F172A';

function colLetter(n: number): string {
  let s = '';
  let num = n + 1;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

export function exportToExcel(opts: ExcelExportOptions) {
  const {
    filename,
    title,
    subtitle,
    meta = [],
    summary = [],
    headers,
    rows,
    currencyColumns = [],
    numberColumns = [],
    percentColumns = [],
    sheetName = 'Report',
    totalRowIndices = [],
    statusColumn,
  } = opts;

  const colCount = headers.length;
  const aoa: any[][] = [];

  // Title block
  aoa.push([title]);
  if (subtitle) aoa.push([subtitle]);
  aoa.push([`Generated: ${new Date().toLocaleString('en-GB')}`]);
  meta.forEach(m => aoa.push([`${m.label}:`, m.value]));
  aoa.push([]);

  // Summary/KPI block
  let summaryStartRow = -1;
  if (summary.length > 0) {
    summaryStartRow = aoa.length;
    aoa.push(['SUMMARY']);
    summary.forEach(s => aoa.push([s.label, s.value]));
    aoa.push([]);
  }

  const headerRowIndex = aoa.length;
  aoa.push(headers);

  const dataStartRow = aoa.length;
  rows.forEach(r => aoa.push(r));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths — auto-size based on header + longest value
  const widths: number[] = headers.map((h, ci) => {
    let max = String(h ?? '').length;
    rows.forEach(r => {
      const v = r[ci];
      const len = String(v ?? '').length;
      if (len > max) max = len;
    });
    return Math.min(Math.max(max + 3, 10), 42);
  });
  ws['!cols'] = widths.map(w => ({ wch: w }));

  // Merge title/subtitle/section-label rows across the table width
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  const lastCol = Math.max(colCount - 1, 1);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } });
  let rowCursor = 1;
  if (subtitle) {
    merges.push({ s: { r: rowCursor, c: 0 }, e: { r: rowCursor, c: lastCol } });
    rowCursor++;
  }
  merges.push({ s: { r: rowCursor, c: 0 }, e: { r: rowCursor, c: lastCol } });
  if (summaryStartRow >= 0) {
    merges.push({ s: { r: summaryStartRow, c: 0 }, e: { r: summaryStartRow, c: lastCol } });
  }
  ws['!merges'] = merges;

  // Styling helpers
  const setCellStyle = (r: number, c: number, style: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...style };
  };

  // Title style
  setCellStyle(0, 0, {
    font: { bold: true, sz: 16, color: { rgb: TITLE_FONT_COLOR } },
    alignment: { horizontal: 'left' },
  });
  if (subtitle) {
    setCellStyle(1, 0, { font: { italic: true, sz: 11, color: { rgb: 'FF64748B' } } });
  }

  // Summary label style
  if (summaryStartRow >= 0) {
    setCellStyle(summaryStartRow, 0, {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_FILL } },
    });
    summary.forEach((_, i) => {
      setCellStyle(summaryStartRow + 1 + i, 0, { font: { bold: true, color: { rgb: 'FF334155' } } });
      setCellStyle(summaryStartRow + 1 + i, 1, { font: { bold: true, color: { rgb: 'FF0EA5E9' } } });
    });
  }

  // Header row style
  for (let c = 0; c < colCount; c++) {
    setCellStyle(headerRowIndex, c, {
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_FILL } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'FFCBD5E1' } },
      },
    });
  }

  // Data rows: number formats + zebra striping + total row highlight
  rows.forEach((r, ri) => {
    const rowIndex = dataStartRow + ri;
    const isTotal = totalRowIndices.includes(ri);
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r: rowIndex, c });
      const cell = ws[ref];
      if (!cell) continue;

      if (currencyColumns.includes(c) && typeof cell.v === 'number') {
        cell.z = '"GH₵" #,##0.00';
      } else if (currencyColumns.includes(c) && typeof cell.v === 'string' && !isNaN(parseFloat(cell.v))) {
        cell.v = parseFloat(cell.v);
        cell.t = 'n';
        cell.z = '"GH₵" #,##0.00';
      } else if (percentColumns.includes(c) && typeof cell.v !== 'undefined') {
        const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v));
        if (!isNaN(num)) {
          cell.v = num / 100;
          cell.t = 'n';
          cell.z = '0.0%';
        }
      } else if (numberColumns.includes(c) && typeof cell.v !== 'undefined') {
        const num = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v));
        if (!isNaN(num)) {
          cell.v = num;
          cell.t = 'n';
          cell.z = '#,##0';
        }
      }

      const baseStyle: any = {
        border: {
          bottom: { style: 'thin', color: { rgb: 'FFE2E8F0' } },
        },
      };
      if (isTotal) {
        baseStyle.font = { bold: true, color: { rgb: 'FF0F172A' } };
        baseStyle.fill = { patternType: 'solid', fgColor: { rgb: TOTAL_FILL } };
      } else if (ri % 2 === 1) {
        baseStyle.fill = { patternType: 'solid', fgColor: { rgb: 'FFF8FAFC' } };
      }
      if (c === statusColumn && cell.v !== undefined && cell.v !== null) {
        const v = String(cell.v).toUpperCase();
        if (v.includes('OUT')) {
          baseStyle.font = { bold: true, color: { rgb: 'FFEF4444' } };
          baseStyle.fill = { patternType: 'solid', fgColor: { rgb: 'FFFEE2E2' } };
        } else if (v.includes('LOW')) {
          baseStyle.font = { bold: true, color: { rgb: 'FFF59E0B' } };
          baseStyle.fill = { patternType: 'solid', fgColor: { rgb: 'FFFEF3C7' } };
        } else if (v.includes('OK')) {
          baseStyle.font = { bold: true, color: { rgb: 'FF10B981' } };
          baseStyle.fill = { patternType: 'solid', fgColor: { rgb: 'FFD1FAE5' } };
        }
      }

      setCellStyle(rowIndex, c, baseStyle);
    }
  });

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 };
  (ws as any)['!view'] = [{ state: 'frozen', ySplit: headerRowIndex + 1 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Legacy CSV fallback, retained for callers that still need plain CSV. */
export function downloadCSV(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map(r => r.map(c => {
    if (c == null) return '""';
    const str = String(c).replace(/"/g, '""');
    return `"${str}"`;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
