# Admin Panel テストスイート

メルカリリサーチツール管理画面のテストスイートです。

## テスト構成

### 📁 ディレクトリ構造
```
__tests__/
├── components/           # コンポーネントのユニットテスト
│   ├── StatsCard.test.tsx
│   └── ProductList.test.tsx
├── api/                  # APIエンドポイントのテスト
│   ├── version.test.ts
│   └── create-amazon-tsv.test.ts
├── lib/                  # ライブラリ関数のテスト
│   └── utils.test.ts
├── app/                  # ページコンポーネントのテスト
│   └── page.test.tsx
├── integration/          # 統合テスト
│   └── dashboard-flow.test.tsx
├── setup/               # テストセットアップとユーティリティ
│   └── test-utils.tsx
└── README.md
```

## テスト実行

### 基本コマンド
```bash
# すべてのテストを実行
npm test

# ウォッチモードでテスト実行
npm run test:watch

# カバレッジ付きでテスト実行
npm run test:coverage
```

### 個別テスト実行
```bash
# 特定のテストファイルを実行
npm test StatsCard.test.tsx

# 特定のテストパターンを実行
npm test -- --testPathPattern="components"

# 特定のテストケースを実行
npm test -- --testNamePattern="正しくレンダリングされる"
```

## テスト種別

### 🔧 ユニットテスト
個別のコンポーネントや関数の単体テスト

**対象:**
- `StatsCard` コンポーネント
- `ProductList` コンポーネント  
- `formatCurrency` ユーティリティ関数

**テスト観点:**
- プロパティの正しい表示
- エラー処理
- エッジケース
- スナップショット

### 🌐 APIテスト
Next.js App Router APIエンドポイントのテスト

**対象:**
- `/api/version` - バージョン情報取得
- `/api/create-amazon-tsv` - Amazon出品データ生成

**テスト観点:**
- レスポンス形式
- エラーハンドリング
- データ変換
- ファイル生成

### 📱 ページテスト
ページコンポーネントの機能テスト

**対象:**
- ダッシュボードページ (`app/page.tsx`)

**テスト観点:**
- データ取得と表示
- 統計計算
- デモモード
- エラー状態

### 🔗 統合テスト
複数コンポーネントを組み合わせた動作テスト

**対象:**
- ダッシュボード全体のデータフロー
- ユーザーインタラクション
- 状態管理

**テスト観点:**
- エンドツーエンドの動作
- データの整合性
- ユーザー体験

## モッキング戦略

### 🗄️ Supabaseクライアント
```typescript
const mockSupabase = createSupabaseMock('success') // 成功シナリオ
const mockSupabase = createSupabaseMock('error')   // エラーシナリオ
const mockSupabase = createSupabaseMock('empty')   // 空データシナリオ
```

### 🖼️ Next.jsコンポーネント
- `next/image` - img要素にフォールバック
- `next/router` - ルーター機能をモック

### 🌍 環境変数
```typescript
setupTestEnvironment('production') // 本番環境モード
setupTestEnvironment('demo')       // デモモード
```

## テストヘルパー

### 📊 データ生成
```typescript
const product = createMockProduct({
  title: 'カスタム商品名',
  price: 15000,
  is_filtered: true
})
```

### 🎯 カスタムレンダー
```typescript
import { render, screen } from '../setup/test-utils'

render(<MyComponent />)
```

### ⏱️ 非同期処理
```typescript
await waitFor(() => {
  expect(screen.getByText('データ')).toBeInTheDocument()
})
```

## カバレッジ目標

| 種別 | 目標カバレッジ |
|------|---------------|
| Statements | > 90% |
| Branches | > 85% |
| Functions | > 90% |
| Lines | > 90% |

## 継続的インテグレーション

### GitHub Actions設定例
```yaml
- name: Run tests
  run: npm test -- --coverage --watchAll=false

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## ベストプラクティス

### ✅ 推奨事項
- **AAA パターン**: Arrange, Act, Assert
- **明確なテスト名**: 何をテストしているかが分かる名前
- **独立性**: テスト間で状態を共有しない
- **リアルなデータ**: 実際のユースケースに近いテストデータ

### ❌ 避けるべき事項
- テストの中でのテスト（nested describe）
- 複数の機能を一つのテストでテストする
- 実装詳細のテスト
- 外部依存への直接アクセス

## トラブルシューティング

### よくある問題

**1. モジュールが見つからない**
```bash
# jest.config.jsのmoduleNameMappingを確認
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/$1'
}
```

**2. 非同期テストのタイムアウト**
```typescript
// タイムアウト時間を延長
await waitFor(() => {
  expect(element).toBeInTheDocument()
}, { timeout: 5000 })
```

**3. Next.js Image最適化エラー**
```typescript
// jest.setup.jsでImageコンポーネントをモック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} />
}))
```

## 参考資料

- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)