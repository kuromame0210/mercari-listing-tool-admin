import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // package.jsonから最新のバージョン情報を取得
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // .env.localからビルド時間を取得
    const envPath = path.join(process.cwd(), '.env.local');
    let buildTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const buildTimeMatch = envContent.match(/NEXT_PUBLIC_BUILD_TIME=(.+)/);
      if (buildTimeMatch) {
        buildTime = buildTimeMatch[1];
      }
    }
    
    return NextResponse.json({
      version: packageJson.version,
      buildTime: buildTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('バージョン取得エラー:', error);
    return NextResponse.json({
      version: '2.0.0',
      buildTime: 'unknown',
      timestamp: new Date().toISOString(),
      error: 'バージョン取得失敗'
    });
  }
}