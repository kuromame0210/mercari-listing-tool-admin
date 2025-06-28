'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, TABLE_NAMES } from '../../lib/supabase';
import { Plus, Edit, Trash2, Save, X, Download, Upload } from 'lucide-react';

interface PriceTable {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PriceRange {
  id: string;
  price_table_id: string;
  min_price: number;
  max_price: number | null;
  fixed_price: number | null;
  profit_rate: number | null;
  shipping_cost: number | null;
  platform_fee_rate: number | null;
  created_at: string;
}

interface Platform {
  id: string;
  platform_name: string;
  platform_code: string;
  platform_fee_rate: number;
}

export default function PriceTablesPage() {
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [newTable, setNewTable] = useState({ table_name: '', description: '' });
  const [showNewTable, setShowNewTable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // 価格表を取得
      const { data: tables, error: tablesError } = await supabase
        .from(TABLE_NAMES.PRICE_TABLES)
        .select('*')
        .order('created_at', { ascending: false });

      if (tablesError) throw tablesError;
      setPriceTables(tables || []);

      // 価格範囲を取得
      const { data: ranges, error: rangesError } = await supabase
        .from(TABLE_NAMES.PRICE_RANGES)
        .select('*')
        .order('min_price', { ascending: true });

      if (rangesError) throw rangesError;
      setPriceRanges(ranges || []);

      // プラットフォームを取得
      const { data: platformData, error: platformError } = await supabase
        .from(TABLE_NAMES.PLATFORMS)
        .select('*')
        .order('platform_name');

      if (platformError) throw platformError;
      setPlatforms(platformData || []);

    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createPriceTable() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.PRICE_TABLES)
        .insert({
          name: newTable.table_name,
          description: newTable.description,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setPriceTables([data, ...priceTables]);
      setNewTable({ table_name: '', description: '' });
      setShowNewTable(false);
    } catch (error) {
      console.error('価格表作成エラー:', error);
    }
  }

  async function deletePriceTable(id: string) {
    if (!confirm('この価格表を削除しますか？関連する価格範囲もすべて削除されます。')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRICE_TABLES)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPriceTables(priceTables.filter(table => table.id !== id));
      setPriceRanges(priceRanges.filter(range => range.price_table_id !== id));
    } catch (error) {
      console.error('価格表削除エラー:', error);
    }
  }

  async function addPriceRange(tableId: string) {
    try {
      // 既存の範囲を取得して次の範囲を決定
      const existingRanges = getTableRanges(tableId);
      const lastRange = existingRanges.sort((a, b) => (b.max_price || 0) - (a.max_price || 0))[0];
      
      let newMinPrice = 0;
      let newMaxPrice = 10000;
      
      if (lastRange && lastRange.max_price) {
        newMinPrice = lastRange.max_price + 1;
        newMaxPrice = Math.min(newMinPrice + 10000, 2000000); // 200万円まで
      }
      
      // 中間値の2倍をデフォルト出品価格とする
      const midPrice = (newMinPrice + newMaxPrice) / 2;
      const defaultListingPrice = Math.round(midPrice * 2);

      const { data, error } = await supabase
        .from(TABLE_NAMES.PRICE_RANGES)
        .insert({
          price_table_id: tableId,
          min_price: newMinPrice,
          max_price: newMaxPrice,
          fixed_listing_price: defaultListingPrice,
          profit_rate: null
        })
        .select()
        .single();

      if (error) throw error;

      setPriceRanges([...priceRanges, data]);
    } catch (error) {
      console.error('価格範囲追加エラー:', error);
    }
  }

  async function createDefaultRanges(tableId: string) {
    if (!confirm('デフォルトの価格範囲を一括作成しますか？（0円〜200万円を複数の範囲に分割）')) {
      return;
    }

    try {
      // デフォルトの価格範囲を定義（0円〜200万円）
      const defaultRanges = [
        { min: 0, max: 1000 },
        { min: 1001, max: 3000 },
        { min: 3001, max: 5000 },
        { min: 5001, max: 10000 },
        { min: 10001, max: 20000 },
        { min: 20001, max: 30000 },
        { min: 30001, max: 50000 },
        { min: 50001, max: 100000 },
        { min: 100001, max: 200000 },
        { min: 200001, max: 500000 },
        { min: 500001, max: 1000000 },
        { min: 1000001, max: 2000000 }
      ];

      const newRanges = defaultRanges.map(range => {
        const midPrice = (range.min + range.max) / 2;
        const defaultListingPrice = Math.round(midPrice * 2);
        
        return {
          price_table_id: tableId,
          min_price: range.min,
          max_price: range.max,
          fixed_listing_price: defaultListingPrice,
          profit_rate: null
        };
      });

      const { data, error } = await supabase
        .from(TABLE_NAMES.PRICE_RANGES)
        .insert(newRanges)
        .select();

      if (error) throw error;

      setPriceRanges([...priceRanges, ...(data || [])]);
    } catch (error) {
      console.error('一括作成エラー:', error);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTableRanges = (tableId: string) => {
    return priceRanges.filter(range => range.price_table_id === tableId);
  };

  // CSV出力機能
  const exportToCSV = () => {
    try {
      const csvContent = [
        ['価格表名', '最小価格', '最大価格', '固定価格', '利益率', '送料', 'プラットフォーム手数料率'].join('\t'),
        ...priceTables.flatMap(table => 
          getTableRanges(table.id).map(range => [
            `"${table.name}"`,
            range.min_price,
            range.max_price || '',
            range.fixed_price || '',
            range.profit_rate || '',
            range.shipping_cost || '',
            range.platform_fee_rate || ''
          ].join('\t'))
        )
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `価格表_${new Date().toISOString().split('T')[0]}.tsv`);
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
        const importData: { [tableName: string]: any[] } = {};

        for (const line of dataLines) {
          const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
          if (columns.length < 7) continue;

          const [tableName, minPrice, maxPrice, fixedPrice, profitRate, shippingCost, platformFeeRate] = columns;
          
          if (!importData[tableName]) {
            importData[tableName] = [];
          }

          importData[tableName].push({
            min_price: parseInt(minPrice) || 0,
            max_price: maxPrice ? parseInt(maxPrice) : null,
            fixed_price: fixedPrice ? parseInt(fixedPrice) : null,
            profit_rate: profitRate ? parseFloat(profitRate) : null,
            shipping_cost: shippingCost ? parseInt(shippingCost) : null,
            platform_fee_rate: platformFeeRate ? parseFloat(platformFeeRate) : null
          });
        }

        // 価格表とレンジを作成
        for (const [tableName, ranges] of Object.entries(importData)) {
          // 価格表を作成
          const { data: tableData, error: tableError } = await supabase
            .from(TABLE_NAMES.PRICE_TABLES)
            .insert({
              name: tableName,
              description: `${tableName}（CSVインポート）`,
              is_active: true
            })
            .select()
            .single();

          if (tableError) {
            console.error(`価格表 "${tableName}" の作成エラー:`, tableError);
            continue;
          }

          // 価格範囲を追加
          const rangesWithTableId = ranges.map(range => ({
            ...range,
            price_table_id: tableData.id
          }));

          const { error: rangeError } = await supabase
            .from(TABLE_NAMES.PRICE_RANGES)
            .insert(rangesWithTableId);

          if (rangeError) {
            console.error(`価格範囲の作成エラー:`, rangeError);
          }
        }

        alert(`${Object.keys(importData).length}個の価格表をインポートしました`);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">価格表設定</h1>
        <p className="text-gray-600">メルカリ・ラクマ・ヤフオク等のプラットフォーム別価格設定</p>
      </div>

      {/* プラットフォーム手数料一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">プラットフォーム手数料</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {platforms.map((platform) => (
            <div key={platform.id} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{platform.platform_name}</div>
              <div className="text-sm text-gray-600">{platform.platform_fee_rate}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* 新しい価格表作成 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">価格表管理</h2>
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
              onClick={() => setShowNewTable(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              新しい価格表
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

        {showNewTable && (
          <div className="border rounded-lg p-4 mb-4 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="価格表名（例：メルカリ用価格表）"
                value={newTable.table_name}
                onChange={(e) => setNewTable({ ...newTable, table_name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="説明（例：メルカリ向けの固定価格設定）"
                value={newTable.description}
                onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={createPriceTable}
                disabled={!newTable.table_name}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </button>
              <button
                onClick={() => {
                  setShowNewTable(false);
                  setNewTable({ table_name: '', description: '' });
                }}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 価格表一覧 */}
        <div className="space-y-6">
          {priceTables.map((table) => (
            <div key={table.id} className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{table.name}</h3>
                  <p className="text-sm text-gray-600">{table.description}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                    table.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {table.is_active ? '有効' : '無効'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => addPriceRange(table.id)}
                    className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    範囲追加
                  </button>
                  <button
                    onClick={() => createDefaultRanges(table.id)}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    一括作成
                  </button>
                  <button
                    className="text-gray-600 hover:text-gray-800"
                    title="編集"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePriceTable(table.id)}
                    className="text-red-600 hover:text-red-800"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 価格範囲テーブル */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">最小価格</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">最大価格</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">固定出品価格</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">利益率</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getTableRanges(table.id).map((range) => (
                      <tr key={range.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(range.min_price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {range.max_price ? formatCurrency(range.max_price) : '上限なし'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {range.fixed_price ? formatCurrency(range.fixed_price) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {range.profit_rate ? `${range.profit_rate}%` : '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button className="text-gray-600 hover:text-gray-800" title="編集">
                              <Edit className="w-3 h-3" />
                            </button>
                            <button className="text-red-600 hover:text-red-800" title="削除">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {getTableRanges(table.id).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          価格範囲が設定されていません。「範囲追加」ボタンから追加してください。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {priceTables.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              価格表がありません。「新しい価格表」ボタンから作成してください。
            </div>
          )}
        </div>
      </div>

      {/* 使用例 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">価格表の使い方</h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">1. 価格表作成</h4>
            <p>プラットフォーム毎に価格表を作成します（例：メルカリ用、ラクマ用など）</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">2. 価格範囲設定</h4>
            <p>仕入れ価格の範囲に対して、固定の出品価格または利益率を設定します</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">3. 自動価格計算</h4>
            <p>商品収集時に設定した価格表を元に、自動で出品価格が計算されます</p>
          </div>
        </div>
      </div>
    </div>
  );
}