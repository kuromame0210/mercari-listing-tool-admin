'use client';

import { useState, useEffect } from 'react';
import { supabase, TABLE_NAMES, Product, Platform } from '../../lib/supabase';

export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // Supabase設定
  const [supabaseConfig, setSupabaseConfig] = useState({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  });

  // Chrome拡張機能設定
  const [extensionSettings, setExtensionSettings] = useState({
    autoCollection: true,
    collectionInterval: 5000,
    maxProductsPerPage: 50,
    enableNotifications: true
  });

  useEffect(() => {
    loadData();
    checkSupabaseConnection();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const platformsResponse = await supabase
        .from(TABLE_NAMES.PLATFORMS)
        .select('*')
        .order('platform_name');

      if (platformsResponse.error) throw platformsResponse.error;
      setPlatforms(platformsResponse.data || []);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from(TABLE_NAMES.PLATFORMS).select('count').limit(1);
      if (error) throw error;
      setConnectionStatus('connected');
    } catch (err) {
      setConnectionStatus('error');
    }
  };

  const handlePlatformToggle = async (platformId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PLATFORMS)
        .update({ is_active: !isActive })
        .eq('id', platformId);
      
      if (error) throw error;
      
      setSuccess('プラットフォーム設定を更新しました');
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const exportToCSV = async (type: 'all' | 'active' | 'filtered' | 'amazon_ready') => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select(`
          *,
          platform:${TABLE_NAMES.PLATFORMS}(*)
        `);

      switch (type) {
        case 'active':
          query = query.eq('is_filtered', false);
          break;
        case 'filtered':
          query = query.eq('is_filtered', true);
          break;
        case 'amazon_ready':
          query = query.eq('amazon_status', 'ready');
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      const csvContent = generateCSV(data || []);
      downloadCSV(csvContent, `products_${type}_${new Date().toISOString().split('T')[0]}.tsv`);
      
      setSuccess('CSVファイルをダウンロードしました');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV出力に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCSV = (products: Product[]) => {
    const headers = [
      'ID', 'プラットフォーム', 'URL', '商品ID', 'タイトル', '価格', 
      '出品者名', '商品状態', '説明', 'フィルタ済み', 'Amazon出品価格',
      'Amazon利益率', 'Amazon ROI', 'Amazon状態', '作成日'
    ];

    const rows = products.map(product => [
      product.id,
      product.platform?.platform_name || '',
      product.url,
      product.product_id || '',
      product.title || '',
      product.price || 0,
      product.seller_name || '',
      product.product_condition || '',
      product.description || '',
      product.is_filtered ? 'はい' : 'いいえ',
      product.listing_price || '',
      product.amazon_profit_margin || '',
      product.amazon_roi || '',
      product.amazon_status || '',
      new Date(product.created_at).toLocaleDateString('ja-JP')
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join('\t'))
      .join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExtensionManifest = () => {
    return JSON.stringify({
      "manifest_version": 3,
      "name": "フリマリサーチツール",
      "version": "2.0.0",
      "description": "フリマサイトの商品情報を自動収集してSupabaseに送信",
      "permissions": [
        "activeTab",
        "storage"
      ],
      "host_permissions": [
        "https://jp.mercari.com/*",
        "https://www.mercari.com/*"
      ],
      "content_scripts": [
        {
          "matches": ["https://jp.mercari.com/*", "https://www.mercari.com/*"],
          "js": ["utils.js", "mercari-collector.js"]
        }
      ],
      "action": {
        "default_popup": "popup.html",
        "default_title": "フリマリサーチツール"
      },
      "options_page": "options.html",
      "background": {
        "service_worker": "background.js"
      }
    }, null, 2);
  };

  if (isLoading && platforms.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">システム設定</h1>
        <p className="text-gray-600">Supabase接続・CSV出力・Chrome拡張機能設定</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Supabase接続設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Supabase接続設定</h3>
            <div className={`flex items-center space-x-2 ${
              connectionStatus === 'connected' ? 'text-green-600' : 
              connectionStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? '接続済み' : 
                 connectionStatus === 'error' ? '接続エラー' : '確認中...'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supabase URL
              </label>
              <input
                type="text"
                value={supabaseConfig.url}
                onChange={(e) => setSupabaseConfig({...supabaseConfig, url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                placeholder="https://your-project.supabase.co"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anon Key
              </label>
              <input
                type="password"
                value={supabaseConfig.anonKey}
                onChange={(e) => setSupabaseConfig({...supabaseConfig, anonKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                placeholder="eyJ..."
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              環境変数で設定されています。変更する場合は.envファイルを編集してください。
            </p>
          </div>
        </div>

        {/* プラットフォーム管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">プラットフォーム管理</h3>
          
          <div className="space-y-3">
            {platforms.map((platform) => (
              <div key={platform.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{platform.platform_name}</h4>
                    <p className="text-sm text-gray-500">{platform.base_url}</p>
                    <p className="text-xs text-gray-400">手数料: {platform.platform_fee_rate}%</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    platform.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {platform.is_active ? '有効' : '無効'}
                  </span>
                  
                  <button
                    onClick={() => handlePlatformToggle(platform.id, platform.is_active)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      platform.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {platform.is_active ? '無効にする' : '有効にする'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CSV出力設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">CSV出力</h3>
          <p className="text-gray-600 mb-4">商品データをCSVファイルとしてダウンロードできます。</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => exportToCSV('all')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isLoading}
            >
              全商品
            </button>
            
            <button
              onClick={() => exportToCSV('active')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={isLoading}
            >
              有効商品のみ
            </button>
            
            <button
              onClick={() => exportToCSV('filtered')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              disabled={isLoading}
            >
              フィルタ済みのみ
            </button>
            
            <button
              onClick={() => exportToCSV('amazon_ready')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              disabled={isLoading}
            >
              Amazon準備完了
            </button>
          </div>
        </div>

        {/* Chrome拡張機能設定 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Chrome拡張機能設定</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={extensionSettings.autoCollection}
                    onChange={(e) => setExtensionSettings({
                      ...extensionSettings, 
                      autoCollection: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">自動収集を有効にする</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={extensionSettings.enableNotifications}
                    onChange={(e) => setExtensionSettings({
                      ...extensionSettings, 
                      enableNotifications: e.target.checked
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">通知を有効にする</span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  収集間隔 (ミリ秒)
                </label>
                <input
                  type="number"
                  value={extensionSettings.collectionInterval}
                  onChange={(e) => setExtensionSettings({
                    ...extensionSettings, 
                    collectionInterval: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1000"
                  max="30000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  1ページあたりの最大商品数
                </label>
                <input
                  type="number"
                  value={extensionSettings.maxProductsPerPage}
                  onChange={(e) => setExtensionSettings({
                    ...extensionSettings, 
                    maxProductsPerPage: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="10"
                  max="100"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">manifest.json設定</h4>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
              {getExtensionManifest()}
            </pre>
          </div>
        </div>

        {/* システム情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">システム情報</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900">バージョン</h4>
              <p className="text-sm text-gray-600">v2.0.0</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900">データベース</h4>
              <p className="text-sm text-gray-600">Supabase PostgreSQL</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900">最終更新</h4>
              <p className="text-sm text-gray-600">{new Date().toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}