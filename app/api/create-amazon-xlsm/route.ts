import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    // Amazon Windows-31J対応の文字クリーンアップ関数
    const cleanText = (text: string): string => {
      if (!text) return '';
      return text
        // 制御文字を完全に除去（タブ、改行、復帰以外）
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Windows-31Jで問題となる特殊文字を除去・置換
        .replace(/[–—]/g, '-')  // 全角ダッシュ・EMダッシュを半角ハイフンに
        .replace(/['']/g, "'")  // スマートクォート（シングル）を普通のクォートに
        .replace(/[""]/g, '"')  // スマートクォート（ダブル）を普通のクォートに
        .replace(/[…]/g, '...')  // 三点リーダーを3つのドットに
        .replace(/[•]/g, '・')   // ビュレットを中点に
        .replace(/[®©™]/g, '')   // 商標記号を除去
        .replace(/[€£¥]/g, '')   // 通貨記号を除去（円記号以外）
        .replace(/[αβγδεζηθικλμνξοπρστυφχψω]/g, '')  // ギリシャ文字を除去
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')  // 上付き文字を除去
        .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '')  // 下付き文字を除去
        .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')  // 丸数字を除去
        .replace(/[㍉㌢㍍㌔㌘㌧㍑㌫㌣㌘㌻]/g, '')  // 単位記号を除去
        .replace(/[♀♂♪♫♬]/g, '')  // 記号を除去
        // 絵文字や装飾文字を除去
        .replace(/[\u{1F000}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // 0x97問題のバイトを除去
        .replace(/[\u0097]/g, '')
        // 高位Unicode文字（Windows-31Jで表現できない）を除去
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
        // 連続する空白を単一空白に
        .replace(/\s+/g, ' ')
        // 前後の空白を除去
        .trim()
        // 最終的にASCII+ひらがな+カタカナ+漢字+基本記号のみを許可
        .replace(/[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF01-\uFF5E]/g, '');
    };

    // Amazon公式テンプレートを読み込む
    const templatePath = '/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/SCREWS.xlsm';
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Amazon template file not found' }, 
        { status: 404 }
      );
    }

    const amazonTemplate = XLSX.readFile(templatePath);

    // データをAmazonフォーマットに変換
    const amazonData = [];
    
    // Amazon テンプレートシートの構造を保持（行1-5）
    const templateSheet = amazonTemplate.Sheets['テンプレート'];
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

    // システムデータをAmazonテンプレートの6行目以降に追加
    products.forEach((product: any) => {
      // コンディションのマッピング
      const conditionMapping: Record<string, string> = {
        '新品、未使用': 'New',
        '未使用に近い': 'Used',
        '目立った傷や汚れなし': 'Used',
        'やや傷や汚れあり': 'Used',
        '傷や汚れあり': 'Used',
        '全体的に状態が悪い': 'Used'
      };
      
      const condition = conditionMapping[product.condition || ''] || 'Used';
      
      const amazonRow = new Array(232).fill(''); // HX列まで空で初期化
      
      // 基本的な列のマッピング
      amazonRow[0] = product.id || '';  // SKU
      amazonRow[1] = '作成または置換';  // アクション（デフォルト）
      amazonRow[2] = 'SCREWS';  // 商品タイプ
      amazonRow[3] = product.title || '';  // 商品名
      amazonRow[4] = product.brand || 'ノーブランド品';  // ブランド
      amazonRow[5] = 'UPC';  // IDタイプ（デフォルト）
      amazonRow[6] = '';  // 商品ID/UPC
      amazonRow[7] = '3491380051'; // 推奨ブラウズノード
      
      // 価格設定
      const price = Number(product.price || 0);
      amazonRow[10] = price > 0 ? price : 100;  // 販売価格
      
      // 画像設定
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        amazonRow[11] = product.images[0]; // メイン画像
        // サブ画像 (最大8枚)
        for (let i = 1; i < Math.min(product.images.length, 9); i++) {
          amazonRow[13 + i - 1] = product.images[i] || '';
        }
      }
      
      // その他の設定
      amazonRow[8] = 'FALSE'; // アダルト商品
      amazonRow[9] = 1; // 在庫数
      amazonRow[26] = 'Update'; // アップデート・削除
      amazonRow[28] = (product.description || '').replace(/\n/g, ' '); // 商品説明文
      amazonRow[165] = condition; // コンディション
      amazonRow[166] = '中古品です。写真をご確認ください。'; // コンディション説明
      
      amazonData.push(amazonRow);
    });

    // 新しいワークブックを作成
    const newWorkbook = XLSX.utils.book_new();

    // すべての元のシートをコピー（テンプレート以外）
    amazonTemplate.SheetNames.forEach(sheetName => {
      if (sheetName !== 'テンプレート') {
        const originalSheet = amazonTemplate.Sheets[sheetName];
        newWorkbook.Sheets[sheetName] = originalSheet;
        XLSX.utils.book_append_sheet(newWorkbook, originalSheet, sheetName);
      }
    });

    // 新しいテンプレートシートを作成
    const newTemplateSheet = XLSX.utils.aoa_to_sheet(amazonData);
    newWorkbook.Sheets['テンプレート'] = newTemplateSheet;
    XLSX.utils.book_append_sheet(newWorkbook, newTemplateSheet, 'テンプレート');

    // XLSMファイルとしてバイナリデータを生成
    const xlsmBuffer = XLSX.write(newWorkbook, {
      bookType: 'xlsm',
      type: 'buffer'
    });

    // ファイルをバイナリとして返す
    return new NextResponse(xlsmBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
        'Content-Disposition': 'attachment; filename="Amazon_商品登録.xlsm"',
      },
    });

  } catch (error) {
    console.error('Amazon XLSM creation API error:', error);
    return NextResponse.json(
      { error: 'Failed to create Amazon XLSM file' }, 
      { status: 500 }
    );
  }
}