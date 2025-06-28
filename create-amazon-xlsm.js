const XLSX = require('xlsx');
const fs = require('fs');

// Amazon公式テンプレートを読み込む
const amazonTemplate = XLSX.readFile('/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/SCREWS.xlsm');

// システムのCSVテンプレートを読み込む
const systemCsv = fs.readFileSync('/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/Amazon_インベントリファイル_20250615T025945.csv', 'utf8');

console.log('=== Creating Amazon XLSM with System Data ===');

// システムCSVのデータを解析
const systemLines = systemCsv.split('\n').filter(line => line.trim());
console.log(`System CSV has ${systemLines.length} lines`);

// Amazon テンプレートシートの構造を確認
const templateSheet = amazonTemplate.Sheets['テンプレート'];
console.log('Amazon template structure:');

// 行1-5の情報をそのまま保持
const amazonData = [];
for (let r = 0; r < 6; r++) {
    const row = [];
    const maxCol = 232; // HX列まで
    for (let c = 0; c < maxCol; c++) {
        const cellAddr = XLSX.utils.encode_cell({r: r, c: c});
        const cell = templateSheet[cellAddr];
        row.push(cell ? cell.v : '');
    }
    amazonData.push(row);
}

// システムのCSVデータを解析してAmazon形式に変換
const systemRows = systemLines.map(line => {
    // CSVを正しく解析（カンマ区切り、クォート対応）
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
});

console.log(`Parsed ${systemRows.length} system rows`);
console.log('System headers:', systemRows[0]);

// システムデータをAmazonテンプレートの6行目以降に追加
systemRows.forEach((row, index) => {
    if (index === 0) return; // ヘッダーはスキップ
    
    // システムCSVは既にAmazonテンプレート形式なので、そのまま使用
    const amazonRow = [...row]; // 既存データをコピー
    
    // 必要に応じて列数を232に調整
    while (amazonRow.length < 232) {
        amazonRow.push('');
    }
    
    // part_number（28列目、0ベースで27）にSKUを設定（エラー対策）
    if (amazonRow[1] && !amazonRow[27]) {  // SKUが存在し、part_numberが空の場合
        amazonRow[27] = amazonRow[1];  // SKUをpart_numberに設定
    }
    
    amazonData.push(amazonRow);
});

console.log(`Total rows in output: ${amazonData.length}`);

// 新しいワークブックを作成
const newWorkbook = XLSX.utils.book_new();

// すべての元のシートをコピー（テンプレート以外）
amazonTemplate.SheetNames.forEach(sheetName => {
    if (sheetName !== 'テンプレート') {
        newWorkbook.Sheets[sheetName] = amazonTemplate.Sheets[sheetName];
        XLSX.utils.book_append_sheet(newWorkbook, amazonTemplate.Sheets[sheetName], sheetName);
    }
});

// 新しいテンプレートシートを作成
const newTemplateSheet = XLSX.utils.aoa_to_sheet(amazonData);
newWorkbook.Sheets['テンプレート'] = newTemplateSheet;
XLSX.utils.book_append_sheet(newWorkbook, newTemplateSheet, 'テンプレート');

// XLSMファイルとして出力
const outputPath = '/Users/kurosawaryoufutoshi/Downloads/research-tool/admin-panel/system-products-amazon-format.xlsm';
XLSX.writeFile(newWorkbook, outputPath, {bookType: 'xlsm'});

console.log(`✅ Amazon XLSM file created: ${outputPath}`);
console.log(`📊 Included ${amazonData.length - 6} product rows`);