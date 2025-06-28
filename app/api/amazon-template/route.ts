import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Amazon公式テンプレートファイルのパス
    const templatePath = '/Users/kurosawaryoufutoshi/Downloads/research-tool/sumple/SCREWS.xlsm';
    
    // ファイルが存在するかチェック
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Amazon template file not found' }, 
        { status: 404 }
      );
    }

    // ファイルを読み込み
    const fileBuffer = fs.readFileSync(templatePath);

    // ファイルをバイナリとして返す
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
        'Content-Disposition': 'attachment; filename="SCREWS.xlsm"',
      },
    });

  } catch (error) {
    console.error('Amazon template API error:', error);
    return NextResponse.json(
      { error: 'Failed to load Amazon template' }, 
      { status: 500 }
    );
  }
}