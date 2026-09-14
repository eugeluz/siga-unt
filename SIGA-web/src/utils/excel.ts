import * as XLSX from 'xlsx';

export const downloadExcel = (data: any[], headers: string[], keys: string[], filename: string) => {
  const rows = data.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h] = row[keys[i]] ?? '';
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = headers.map(h => ({
    wch: Math.max(
      h.length,
      ...rows.map(r => String(r[h] || '').length)
    ) + 2
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

  XLSX.writeFile(wb, filename);
};

export interface ExcelSheetSpec {
  name: string;
  data: any[];
  headers: string[];
  keys: string[];
}

/** Un solo archivo .xlsx con varias hojas (ej: Cursos + Fechas por separado). */
export const downloadExcelMultiSheet = (sheets: ExcelSheetSpec[], filename: string) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet, idx) => {
    const rows = sheet.data.map(row => {
      const obj: Record<string, any> = {};
      sheet.headers.forEach((h, i) => {
        obj[h] = row[sheet.keys[i]] ?? '';
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = sheet.headers.map(h => ({
      wch: Math.max(h.length, ...rows.map(r => String(r[h] || '').length)) + 2
    }));

    const safeName = (sheet.name || `Hoja${idx + 1}`).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, filename);
};
