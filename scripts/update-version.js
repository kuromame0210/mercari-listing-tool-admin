#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// package.jsonのパス
const packagePath = path.join(__dirname, '..', 'package.json');

try {
  // 現在のGitコミットハッシュを取得
  const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  
  // 現在の日時を取得
  const buildTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  // package.jsonを読み込み
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // 現在のバージョンからパッチバージョンを上げる
  const versionParts = packageJson.version.split('.');
  const major = parseInt(versionParts[0]);
  const minor = parseInt(versionParts[1]);
  const patch = parseInt(versionParts[2]) + 1;
  
  const newVersion = `${major}.${minor}.${patch}`;
  
  // バージョンを更新
  packageJson.version = newVersion;
  
  // package.jsonを書き込み
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  // 環境変数ファイルを更新
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // 既存のバージョン情報を削除
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('NEXT_PUBLIC_VERSION=') && !line.startsWith('NEXT_PUBLIC_BUILD_TIME='))
    .join('\n');
  
  // 新しいバージョン情報を追加
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `NEXT_PUBLIC_VERSION=${newVersion}\n`;
  envContent += `NEXT_PUBLIC_BUILD_TIME=${buildTime}\n`;
  
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ バージョンを ${newVersion} に更新しました`);
  console.log(`📅 ビルド時間: ${buildTime}`);
  console.log(`🔗 Gitハッシュ: ${gitHash}`);
  
} catch (error) {
  console.error('❌ バージョン更新エラー:', error.message);
  process.exit(1);
}