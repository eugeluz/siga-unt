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
