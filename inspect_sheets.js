const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'd:/1_Centro/2026/SIGA2026.xlsm';
console.log('Reading workbook:', excelPath);

const workbook = XLSX.readFile(excelPath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    console.log(`Sheet: "${sheetName}" | Range: ${sheet['!ref']} | Rows: ${rowCount} | Cols: ${colCount}`);
    
    // Print first 5 rows for small sheets, or sheet names
    if (sheetName === 'Inicio' || rowCount < 20) {
        console.log(`--- Content of "${sheetName}" (up to 10 rows) ---`);
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        json.slice(0, 10).forEach((row, i) => {
            console.log(`  Row ${i + 1}:`, row.slice(0, 8));
        });
    }
});
