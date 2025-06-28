const XLSX = require('xlsx');

// Amazon公式テンプレートを読み込む
const workbook = XLSX.readFile('/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/SCREWS.xlsm');

console.log('=== Amazon Template Analysis ===');
console.log('Sheet Names:', workbook.SheetNames);

// 各シートの情報を確認
workbook.SheetNames.forEach(sheetName => {
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`Range: ${worksheet['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
  
  // 最初の数行を表示
  if (sheetName === workbook.SheetNames[0]) {
    console.log('\n--- First 5 rows ---');
    for (let r = 0; r <= Math.min(4, range.e.r); r++) {
      let rowData = [];
      for (let c = 0; c <= Math.min(10, range.e.c); c++) {
        const cellAddress = XLSX.utils.encode_cell({c: c, r: r});
        const cell = worksheet[cellAddress];
        rowData.push(cell ? cell.v : '');
      }
      console.log(`Row ${r + 1}:`, rowData.slice(0, 5).join(' | '));
    }
  }
});