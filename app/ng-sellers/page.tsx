'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, TABLE_NAMES } from '../../lib/supabase';
import { UserX, Plus, Trash2, Search, Download, Upload } from 'lucide-react';

interface NGSeller {
  id: number;
  platform: string;
  seller_id: string;
  seller_name?: string;
  reason?: string;
  created_at: string;
}

export default function NGSellersPage() {
  const [ngSellers, setNgSellers] = useState<NGSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeller, setNewSeller] = useState({ 
    platform: 'mercari', 
    seller_id: '', 
    seller_name: '', 
    reason: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNGSellers();
  }, []);

  async function loadNGSellers() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.NG_SELLERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNgSellers(data || []);
    } catch (error) {
      console.error('NG出品者リスト読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addNGSeller() {
    if (!newSeller.seller_id) {
      alert('出品者IDを入力してください');
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.NG_SELLERS)
        .insert([newSeller]);

      if (error) throw error;
      
      setNewSeller({ platform: 'mercari', seller_id: '', seller_name: '', reason: '' });
      loadNGSellers();
    } catch (error) {
      console.error('NG出品者追加エラー:', error);
      alert('追加に失敗しました');
    }
  }

  async function removeNGSeller(id: number) {
    if (!confirm('この出品者をNG リストから削除しますか？')) return;

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.NG_SELLERS)
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNGSellers();
    } catch (error) {
      console.error('NG出品者削除エラー:', error);
      alert('削除に失敗しました');
    }
  }

  const exportToCSV = () => {
    try {
      // CSV用のヘッダー
      const headers = ['プラットフォーム', '出品者ID', '出品者名', '理由', '登録日'];

      // データを変換
      const csvData = filteredSellers.map(seller => [
        `"${seller.platform.replace(/"/g, '""')}"`,
        `"${seller.seller_id.replace(/"/g, '""')}"`,
        `"${(seller.seller_name || '').replace(/"/g, '""')}"`,
        `"${(seller.reason || '').replace(/"/g, '""')}"`,
        `"${new Date(seller.created_at).toLocaleDateString('ja-JP')}"`
      ]);

      // CSVコンテンツを作成
      const csvContent = [
        headers.join('\t'),
        ...csvData.map(row => row.join('\t'))
      ].join('\n');

      // BOMを追加してExcelでの文字化けを防ぐ
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/plain;charset=utf-8;' });

      // ファイルをダウンロード
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `NG出品者_${timestamp}.tsv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`NG出品者CSV出力完了: ${filteredSellers.length}件のデータを出力しました`);
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
          name: string;
          code: string;
          reason: string;
        }> = [];

        for (const line of dataLines) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          if (columns.length < 2) continue;

          const [name, code, reason] = columns;
          
          importData.push({
            name: name || '',
            code: code || '',
            reason: reason || ''
          });
        }

        if (importData.length === 0) {
          alert('インポートできるデータがありませんでした');
          return;
        }

        // データベースに一括挿入
        const { error } = await supabase
          .from(TABLE_NAMES.NG_SELLERS)
          .insert(importData);

        if (error) throw error;

        alert(`${importData.length}件のNG出品者をインポートしました`);
        loadNGSellers();
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

  const filteredSellers = ngSellers.filter(seller =>
    seller.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.seller_id.includes(searchTerm) ||
    (seller.seller_name && seller.seller_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (seller.reason && seller.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-6">
            <UserX className="w-8 h-8 text-red-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">NG出品者管理</h1>
          </div>

          {/* 新規追加フォーム */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-4">新規NG出品者追加</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                value={newSeller.platform}
                onChange={(e) => setNewSeller({ ...newSeller, platform: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mercari">メルカリ</option>
                <option value="yahoo">ヤフオク</option>
                <option value="rakuten">楽天</option>
              </select>
              <input
                type="text"
                placeholder="出品者ID（必須）"
                value={newSeller.seller_id}
                onChange={(e) => setNewSeller({ ...newSeller, seller_id: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="出品者名（任意）"
                value={newSeller.seller_name}
                onChange={(e) => setNewSeller({ ...newSeller, seller_name: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="理由（任意）"
                value={newSeller.reason}
                onChange={(e) => setNewSeller({ ...newSeller, reason: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addNGSeller}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                追加
              </button>
            </div>
          </div>

          {/* 検索とアクション */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="プラットフォーム、出品者ID、出品者名、理由で検索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV出力
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                CSVインポート
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

          {/* NG出品者リスト */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-4">
              NG出品者リスト ({filteredSellers.length}件)
            </h2>
            
            {loading ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : filteredSellers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? '検索結果がありません' : 'NG出品者が登録されていません'}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">プラットフォーム</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">出品者ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">出品者名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">理由</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">登録日</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSellers.map((seller) => (
                      <tr key={seller.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{seller.platform}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">{seller.seller_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{seller.seller_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{seller.reason || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(seller.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeNGSeller(seller.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}