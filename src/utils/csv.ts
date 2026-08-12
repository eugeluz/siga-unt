export const downloadCSV = (data: any[], headers: string[], keys: string[], filename: string) => {
  const BOM = '\uFEFF';
  let csvContent = headers.join(',') + '\n';

  for (const row of data) {
    const values = keys.map(k => {
      let val = row[k] ?? '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    });
    csvContent += values.join(',') + '\n';
  }

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
