const XLSX = require('xlsx');

// Amazon公式テンプレートを読み込む
const workbook = XLSX.readFile('/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/ok_InventoryFile_20250611075308.xlsm');

console.log('=== Success XLSM File Analysis ===');
console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet['!ref']) {
    console.log('Empty sheet');
    return;
  }
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
  
  // 最初の数行を詳しく表示
  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    console.log(`\n--- Row ${r + 1} ---`);
    let rowData = [];
    for (let c = 0; c <= Math.min(20, range.e.c); c++) {
      const cellAddress = XLSX.utils.encode_cell({c: c, r: r});
      const cell = sheet[cellAddress];
      const value = cell ? cell.v : '';
      if (value && value.toString().length > 0) {
        const truncatedValue = value.toString().length > 30 ? value.toString().substring(0, 30) + '...' : value;
        rowData.push(`${XLSX.utils.encode_col(c)}:${truncatedValue}`);
      }
    }
    if (rowData.length > 0) {
      console.log(rowData.slice(0, 8).join(' | '));
    } else {
      console.log('(empty or mostly empty row)');
    }
  }
});

// Focus on the main "テンプレート" sheet
console.log('\n=== Detailed analysis of テンプレート sheet ===');
const templateSheet = workbook.Sheets['テンプレート'];
if (templateSheet && templateSheet['!ref']) {
  const range = XLSX.utils.decode_range(templateSheet['!ref']);
  
  console.log(`Template Sheet Range: ${templateSheet['!ref']}`);
  console.log(`Template Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
  
  // 最初の20列のヘッダーを表示
  console.log('\n=== First 30 columns of each row (first 10 rows) ===');
  for (let r = 0; r < Math.min(10, range.e.r + 1); r++) {
    console.log(`\nRow ${r + 1}:`);
    let headers = [];
    for (let c = 0; c < Math.min(30, range.e.c + 1); c++) {
      const cellAddress = XLSX.utils.encode_cell({c: c, r: r});
      const cell = templateSheet[cellAddress];
      const value = cell ? cell.v : '';
      if (value !== '') {
        const truncatedValue = value.toString().length > 40 ? value.toString().substring(0, 40) + '...' : value;
        headers.push(`${XLSX.utils.encode_col(c)}: ${truncatedValue}`);
      }
    }
    if (headers.length > 0) {
      headers.forEach(header => console.log(`  ${header}`));
    } else {
      console.log('  (empty row)');
    }
  }
}