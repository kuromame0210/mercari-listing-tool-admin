'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      console.log('🔗 Supabase接続テスト開始...');
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

      // 1. プラットフォームテーブル確認
      const { data: platforms, error: platformError } = await supabase
        .from('flea_market_research_platforms')
        .select('*')
        .limit(5);

      console.log('Platform query result:', { platforms, platformError });

      // 2. 商品テーブル確認
      const { data: products, error: productError } = await supabase
        .from('flea_market_research_products')
        .select('*')
        .limit(5);

      console.log('Products query result:', { products, productError });

      // 3. テーブル一覧確認
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', 'flea_market_research_%');

      console.log('Tables query result:', { tables, tableError });

      setResult({
        platforms: { data: platforms, error: platformError },
        products: { data: products, error: productError },
        tables: { data: tables, error: tableError },
        env: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)
        }
      });

    } catch (error) {
      console.error('❌ テストエラー:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Supabase接続テスト</h1>
        <p className="text-gray-600">データベース接続とテーブル確認</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded mb-4"
        >
          {loading ? '接続中...' : '接続テスト実行'}
        </button>

        {result && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">環境変数:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm">
                {JSON.stringify(result.env, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">テーブル一覧:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.tables, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">プラットフォーム:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.platforms, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">商品データ:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(result.products, null, 2)}
              </pre>
            </div>

            {result.error && (
              <div>
                <h3 className="font-bold text-lg mb-2 text-red-600">エラー:</h3>
                <pre className="bg-red-100 p-3 rounded text-sm text-red-800">
                  {result.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}