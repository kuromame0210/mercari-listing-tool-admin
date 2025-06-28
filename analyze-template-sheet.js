const XLSX = require('xlsx');

// Amazon公式テンプレートを読み込む
const workbook = XLSX.readFile('/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/SCREWS.xlsm');

console.log('=== Template Sheet Analysis ===');

// 「テンプレート」シートを詳しく確認
const templateSheet = workbook.Sheets['テンプレート'];
const range = XLSX.utils.decode_range(templateSheet['!ref']);

console.log(`Range: ${templateSheet['!ref']}`);
console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);

// 最初の数行を詳しく表示
for (let r = 0; r <= Math.min(5, range.e.r); r++) {
  console.log(`\n--- Row ${r + 1} ---`);
  let rowData = [];
  for (let c = 0; c <= Math.min(50, range.e.c); c++) {
    const cellAddress = XLSX.utils.encode_cell({c: c, r: r});
    const cell = templateSheet[cellAddress];
    const value = cell ? cell.v : '';
    if (value && value.toString().length > 0) {
      rowData.push(`${XLSX.utils.encode_col(c)}:${value}`);
    }
  }
  if (rowData.length > 0) {
    console.log(rowData.slice(0, 10).join(' | '));
  } else {
    console.log('(empty or mostly empty row)');
  }
}

// 特定のセルの内容を確認
console.log('\n=== Specific cells ===');
console.log('A1:', templateSheet['A1'] ? templateSheet['A1'].v : 'empty');
console.log('A2:', templateSheet['A2'] ? templateSheet['A2'].v : 'empty');
console.log('A3:', templateSheet['A3'] ? templateSheet['A3'].v : 'empty');

// セルの型も確認
console.log('\n=== Cell types ===');
if (templateSheet['A1']) console.log('A1 type:', templateSheet['A1'].t);
if (templateSheet['A2']) console.log('A2 type:', templateSheet['A2'].t);