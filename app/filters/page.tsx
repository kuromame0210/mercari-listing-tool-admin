'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, TABLE_NAMES, KeywordFilter, Platform } from '../../lib/supabase';
import { Download, Upload, FileText } from 'lucide-react';

export default function FiltersPage() {
  const [filters, setFilters] = useState<KeywordFilter[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState<KeywordFilter | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    keyword: '',
    filter_type: 'exclude' as 'exclude' | 'include',
    platform_id: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [filtersResponse, platformsResponse] = await Promise.all([
        supabase
          .from(TABLE_NAMES.KEYWORD_FILTERS)
          .select(`
            *,
            platform:${TABLE_NAMES.PLATFORMS}(*)
          `)
          .order('created_at', { ascending: false }),
        
        supabase
          .from(TABLE_NAMES.PLATFORMS)
          .select('*')
          .eq('is_active', true)
          .order('platform_name')
      ]);

      if (filtersResponse.error) throw filtersResponse.error;
      if (platformsResponse.error) throw platformsResponse.error;

      setFilters(filtersResponse.data || []);
      setPlatforms(platformsResponse.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingFilter) {
        const { error } = await supabase
          .from(TABLE_NAMES.KEYWORD_FILTERS)
          .update({
            keyword: formData.keyword,
            filter_type: formData.filter_type,
            platform_id: formData.platform_id,
            is_active: formData.is_active
          })
          .eq('id', editingFilter.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLE_NAMES.KEYWORD_FILTERS)
          .insert([{
            keyword: formData.keyword,
            filter_type: formData.filter_type,
            platform_id: formData.platform_id,
            is_active: formData.is_active
          }]);
        
        if (error) throw error;
      }

      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    }
  };

  const handleEdit = (filter: KeywordFilter) => {
    setEditingFilter(filter);
    setFormData({
      keyword: filter.keyword,
      filter_type: filter.filter_type,
      platform_id: filter.platform_id,
      is_active: filter.is_active
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このキーワードフィルターを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.KEYWORD_FILTERS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handleToggleActive = async (filter: KeywordFilter) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.KEYWORD_FILTERS)
        .update({ is_active: !filter.is_active })
        .eq('id', filter.id);
      
      if (error) throw error;
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      keyword: '',
      filter_type: 'exclude',
      platform_id: '',
      is_active: true
    });
    setShowAddForm(false);
    setEditingFilter(null);
    setError(null);
  };

  // CSV出力機能
  const exportToCSV = () => {
    try {
      const csvContent = [
        ['キーワード', 'プラットフォーム', 'フィルタータイプ', '有効/無効'].join(','),
        ...filters.map(filter => [
          `"${filter.keyword}"`,
          `"${filter.platform?.platform_name || ''}"`,
          filter.filter_type === 'exclude' ? '除外' : '抽出',
          filter.is_active ? '有効' : '無効'
        ].join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `キーワードフィルター_${new Date().toISOString().split('T')[0]}.csv`);
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
          platform_id: string;
          filter_type: 'exclude' | 'include';
          is_active: boolean;
        }> = [];

        for (const line of dataLines) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          if (columns.length < 4) continue;

          const [keyword, platformName, filterType, activeStatus] = columns;
          
          // プラットフォーム名からIDを取得
          const platform = platforms.find(p => p.platform_name === platformName);
          if (!platform) {
            console.warn(`プラットフォーム "${platformName}" が見つかりません`);
            continue;
          }

          importData.push({
            keyword,
            platform_id: platform.id,
            filter_type: filterType === '抽出' ? 'include' : 'exclude',
            is_active: activeStatus === '有効'
          });
        }

        if (importData.length === 0) {
          alert('インポートできるデータがありませんでした');
          return;
        }

        // データベースに一括挿入
        const { error } = await supabase
          .from(TABLE_NAMES.KEYWORD_FILTERS)
          .insert(importData);

        if (error) throw error;

        alert(`${importData.length}件のキーワードフィルターをインポートしました`);
        loadData();
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">キーワードフィルター</h1>
        <p className="text-gray-600">商品収集時の除外・抽出キーワード設定</p>
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
            「ジャンク」「破損」などの除外キーワード設定
          </p>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              {editingFilter ? 'キーワードフィルター編集' : 'キーワードフィルター追加'}
            </h4>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キーワード
                  </label>
                  <input
                    type="text"
                    value={formData.keyword}
                    onChange={(e) => setFormData({...formData, keyword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例: ジャンク, 破損"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プラットフォーム
                  </label>
                  <select
                    value={formData.platform_id}
                    onChange={(e) => setFormData({...formData, platform_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">選択してください</option>
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.platform_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    フィルタータイプ
                  </label>
                  <select
                    value={formData.filter_type}
                    onChange={(e) => setFormData({...formData, filter_type: e.target.value as 'exclude' | 'include'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exclude">除外</option>
                    <option value="include">抽出</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">有効</option>
                    <option value="false">無効</option>
                  </select>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      キーワード
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      プラットフォーム
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
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
                  {filters.map((filter) => (
                    <tr key={filter.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {filter.keyword}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {filter.platform?.platform_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          filter.filter_type === 'exclude' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {filter.filter_type === 'exclude' ? '除外' : '抽出'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(filter)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            filter.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {filter.is_active ? '有効' : '無効'}
                        </button>
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