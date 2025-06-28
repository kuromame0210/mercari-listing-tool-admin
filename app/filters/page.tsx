'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, TABLE_NAMES, KeywordFilter } from '../../lib/supabase';
import { Download, Upload, FileText, Plus, Trash2, Search, RefreshCw } from 'lucide-react';

export default function FiltersPage() {
  const [filters, setFilters] = useState<KeywordFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState<KeywordFilter | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'exclude' | 'replace_blank'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    keyword: '',
    filter_type: 'exclude'
  });

  useEffect(() => {
    loadData();
  }, []);

  // ローカルストレージキャッシュのキー
  const CACHE_KEY = 'ng_keywords_cache';
  const CACHE_TIMESTAMP_KEY = 'ng_keywords_cache_timestamp';
  const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

  // キャッシュからデータを取得
  const getCachedData = (): KeywordFilter[] | null => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();
        
        if (now - timestamp < CACHE_DURATION) {
          console.log('💾 キャッシュからデータを読み込み');
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      console.warn('キャッシュの読み込みに失敗:', error);
    }
    return null;
  };

  // データをキャッシュに保存
  const setCachedData = (data: KeywordFilter[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log(`💾 ${data.length}件のデータをキャッシュに保存`);
    } catch (error) {
      console.warn('キャッシュの保存に失敗:', error);
    }
  };

  // 全データを段階的に取得
  const loadAllData = async (): Promise<KeywordFilter[]> => {
    const allData: KeywordFilter[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    console.log('📡 全データの取得を開始...');

    while (hasMore) {
      const { data, error } = await supabase
        .from(TABLE_NAMES.NG_KEYWORDS)
        .select('*')
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        allData.push(...data);
        console.log(`📡 ${from + 1}-${from + data.length}件を取得済み (合計: ${allData.length}件)`);
        from += batchSize;
        
        // 取得したデータが1000件未満の場合、これが最後のバッチ
        if (data.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ 全データ取得完了: ${allData.length}件`);
    return allData;
  };

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // キャッシュから読み込み（強制更新でない場合）
      if (!forceRefresh) {
        const cachedData = getCachedData();
        if (cachedData) {
          setFilters(cachedData);
          setIsLoading(false);
          return;
        }
      }

      // 全データを取得
      const allData = await loadAllData();
      
      // データを設定
      setFilters(allData);
      
      // キャッシュに保存
      setCachedData(allData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 手動更新
  const handleRefresh = async () => {
    await loadData(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.keyword.trim()) {
      setError('キーワードを入力してください');
      return;
    }
    
    try {
      if (editingFilter) {
        const { error } = await supabase
          .from(TABLE_NAMES.NG_KEYWORDS)
          .update({ 
            keyword: formData.keyword.trim(),
            filter_type: formData.filter_type,
            is_active: true,
            source: 'manual',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFilter.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE_NAMES.NG_KEYWORDS)
          .insert([{ 
            keyword: formData.keyword.trim(),
            filter_type: formData.filter_type,
            is_active: true,
            original_text: formData.keyword.trim(),
            source: 'manual'
          }]);
        
        if (error) throw error;
      }

      resetForm();
      loadData(true); // キャッシュを無視して強制更新
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleEdit = (filter: KeywordFilter) => {
    setEditingFilter(filter);
    setFormData({
      keyword: filter.keyword,
      filter_type: filter.filter_type || 'exclude'
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('このNGキーワードを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.NG_KEYWORDS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadData(true); // キャッシュを無視して強制更新
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      keyword: '',
      filter_type: 'exclude'
    });
    setShowAddForm(false);
    setEditingFilter(null);
    setError(null);
  };

  // CSV出力機能
  const exportToCSV = () => {
    try {
      const csvContent = [
        ['キーワード', 'フィルタータイプ', 'アクティブ', '作成日時'].join(','),
        ...filters.map(filter => [
          `"${filter.keyword}"`,
          `"${filter.filter_type === 'exclude' ? '除外' : '文字削除'}"`,
          `"${filter.is_active ? '有効' : '無効'}"`,
          `"${new Date(filter.created_at).toLocaleString('ja-JP')}"`
        ].join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `NGキーワード_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('CSV出力エラー:', error);
      alert('CSV出力に失敗しました');
    }
  };

  // CSVインポート機能
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          alert('CSVファイルの形式が正しくありません');
          return;
        }

        // ヘッダー行をスキップ
        const dataLines = lines.slice(1);
        const importData: Array<{
          keyword: string;
          filter_type: 'exclude' | 'replace_blank';
          is_active: boolean;
        }> = [];

        for (const line of dataLines) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          if (columns.length < 2) continue;

          const [keyword, filterType, activeStatus] = columns;
          
          importData.push({
            keyword,
            filter_type: filterType === '文字削除' || filterType === 'replace_blank' ? 'replace_blank' : 'exclude',
            is_active: activeStatus !== '無効' && activeStatus !== 'false'
          });
        }

        if (importData.length === 0) {
          alert('インポートできるデータがありませんでした');
          return;
        }

        // データベースに一括挿入
        const { error } = await supabase
          .from(TABLE_NAMES.NG_KEYWORDS)
          .insert(importData.map(item => ({
            keyword: item.keyword,
            filter_type: item.filter_type,
            is_active: item.is_active,
            original_text: item.keyword,
            source: 'csv_import'
          })));

        if (error) throw error;

        alert(`${importData.length}件のキーワードフィルターをインポートしました`);
        loadData(true); // キャッシュを無視して強制更新
      } catch (error) {
        console.error('CSVインポートエラー:', error);
        alert('CSVインポートに失敗しました');
      }
    };

    reader.readAsText(file, 'UTF-8');
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // フィルタリング機能
  const filteredFilters = filters.filter(filter => {
    const matchesSearch = filter.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || filter.filter_type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">NGキーワード管理</h1>
        <p className="text-gray-600">商品収集時に除外するキーワードの設定</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">フィルター管理</h3>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '更新中...' : '更新'}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV出力
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                CSVインポート
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                新規追加
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileImport}
            className="hidden"
          />
          <p className="text-gray-600 mt-1">
            「ジャンク」「破損」「Budweiser」などのNGキーワード設定
          </p>
          
          {/* 検索・フィルター機能 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="キーワードで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'exclude' | 'replace_blank')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべてのタイプ</option>
                <option value="exclude">除外のみ</option>
                <option value="replace_blank">文字削除のみ</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {filteredFilters.length}件 / {filters.length}件
              </span>
              {getCachedData() && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  💾 キャッシュ済み
                </span>
              )}
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingFilter ? 'NGキーワード編集' : 'NGキーワード追加'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NGキーワード
                  </label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: ジャンク, 破損, Budweiser, [, ]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    フィルタータイプ
                  </label>
                  <select
                    value={formData.filter_type}
                    onChange={(e) => setFormData({...formData, filter_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exclude">除外（商品を除外）</option>
                    <option value="replace_blank">文字削除（タイトルから文字を削除）</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.filter_type === 'exclude' ? 
                      'このキーワードを含む商品は自動的に除外されます' : 
                      'このキーワードはタイトルから自動的に削除されます（[, ], 【, 】などの特殊文字に使用）'
                    }
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingFilter ? '更新' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="p-6">
          {filters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              キーワードフィルターが登録されていません
            </div>
          ) : filteredFilters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              検索条件に一致するキーワードが見つかりません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NGキーワード
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ソース
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFilters.map((filter) => (
                    <tr key={filter.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {filter.keyword}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          filter.filter_type === 'exclude' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {filter.filter_type === 'exclude' ? '除外' : '文字削除'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          filter.source === 'csv_import' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {filter.source === 'csv_import' ? 'CSV' : '手動'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(filter.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(filter)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(filter.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}