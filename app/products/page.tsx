'use client';

import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES, Product } from '../../lib/supabase';
import { Package, Filter, ExternalLink, Edit, Trash2, Download } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadProducts();
  }, [filter, sortOrder]);

  async function loadProducts() {
    try {
      setLoading(true);
      let query = supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select(`
          *,
          platform:platform_id (
            platform_name,
            platform_code
          )
        `)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (filter === 'valid') {
        query = query.eq('is_filtered', false);
      } else if (filter === 'filtered') {
        query = query.eq('is_filtered', true);
      } else if (filter === 'amazon_ready') {
        query = query.eq('amazon_status', 'ready');
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('商品データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    
    // 相対時間も計算
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let relative = '';
    if (diffDays > 0) {
      relative = `${diffDays}日前`;
    } else if (diffHours > 0) {
      relative = `${diffHours}時間前`;
    } else {
      relative = '1時間以内';
    }
    
    return { formatted, relative };
  };

  const getStatusBadge = (product: Product) => {
    if (product.is_filtered) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">フィルタ済み</span>;
    }
    
    switch (product.amazon_status) {
      case 'ready':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">出品準備完了</span>;
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">出品中</span>;
      case 'uploaded':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">アップロード済み</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">下書き</span>;
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditingProduct({
      title: product.title,
      seller_name: product.seller_name,
      product_condition: product.product_condition,
      price: product.price,
      listing_price: product.listing_price,
      amazon_title: product.amazon_title,
      amazon_status: product.amazon_status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingProduct({});
  };

  const saveEdit = async (productId: string) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update(editingProduct)
        .eq('id', productId);

      if (error) throw error;

      // 商品リストを更新
      setProducts(products.map(p => 
        p.id === productId ? { ...p, ...editingProduct } : p
      ));

      setEditingId(null);
      setEditingProduct({});
    } catch (error) {
      console.error('商品更新エラー:', error);
      alert('商品の更新に失敗しました');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('この商品を削除しますか？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('商品削除エラー:', error);
      alert('商品の削除に失敗しました');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">商品管理</h1>
        <p className="text-gray-600">フリマサイトから収集した商品データの表示・編集・Amazon出品準備</p>
      </div>

      {/* フィルターとアクション */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="商品名・出品者で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべて</option>
            <option value="valid">有効商品</option>
            <option value="filtered">フィルタ済み</option>
            <option value="amazon_ready">Amazon準備完了</option>
          </select>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </button>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '検索条件に一致する商品がありません' : '商品がありません'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={toggleSortOrder}
                  >
                    <div className="flex items-center">
                      作成日時
                      <span className="ml-1">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プラットフォーム</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const profit = (product.listing_price || 0) - (product.price || 0);
                  const profitRate = product.price ? ((profit / product.price) * 100) : 0;
                  const isEditing = editingId === product.id;
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {/* 作成日時 */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {formatDateTime(product.created_at).formatted}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDateTime(product.created_at).relative}
                          </div>
                        </div>
                      </td>
                      
                      {/* 商品名 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingProduct.title || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {product.title || '商品名なし'}
                          </div>
                        )}
                      </td>
                      
                      {/* 出品者 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingProduct.seller_name || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, seller_name: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="text-sm text-gray-500">
                            {product.seller_name || '不明'}
                          </div>
                        )}
                      </td>
                      
                      {/* 状態 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editingProduct.product_condition || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, product_condition: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">選択してください</option>
                            <option value="新品、未使用">新品、未使用</option>
                            <option value="未使用に近い">未使用に近い</option>
                            <option value="目立った傷や汚れなし">目立った傷や汚れなし</option>
                            <option value="やや傷や汚れあり">やや傷や汚れあり</option>
                            <option value="傷や汚れあり">傷や汚れあり</option>
                            <option value="全体的に状態が悪い">全体的に状態が悪い</option>
                          </select>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {product.product_condition || '不明'}
                          </div>
                        )}
                      </td>
                      
                      {/* 仕入価格 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingProduct.price || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {formatCurrency(product.price || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* 出品価格 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingProduct.listing_price || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, listing_price: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <div className="text-sm text-green-600">
                            {formatCurrency(product.listing_price || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* 利益 */}
                      <td className="px-6 py-4">
                        <div className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <div>{formatCurrency(profit)}</div>
                          <div>({profitRate.toFixed(1)}%)</div>
                        </div>
                      </td>
                      
                      {/* ステータス */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editingProduct.amazon_status || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, amazon_status: e.target.value as 'draft' | 'ready' | 'uploaded' | 'active' | 'error'})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="draft">下書き</option>
                            <option value="ready">出品準備完了</option>
                            <option value="uploaded">アップロード済み</option>
                            <option value="active">出品中</option>
                          </select>
                        ) : (
                          getStatusBadge(product)
                        )}
                      </td>
                      
                      {/* プラットフォーム */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.platform?.platform_name || 'メルカリ'}
                      </td>
                      
                      {/* アクション */}
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="text-green-600 hover:text-green-800"
                                title="保存"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-800"
                                title="キャンセル"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="元のページを開く"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => startEdit(product)}
                                className="text-gray-600 hover:text-gray-800"
                                title="編集"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="text-red-600 hover:text-red-800"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">表示中の商品統計</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
            <div className="text-sm text-gray-600">表示中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredProducts.filter(p => !p.is_filtered).length}
            </div>
            <div className="text-sm text-gray-600">有効商品</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredProducts.filter(p => p.amazon_status === 'ready').length}
            </div>
            <div className="text-sm text-gray-600">Amazon準備完了</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(
                filteredProducts.reduce((sum, p) => sum + ((p.listing_price || 0) - (p.price || 0)), 0)
              )}
            </div>
            <div className="text-sm text-gray-600">合計予想利益</div>
          </div>
        </div>
      </div>
    </div>
  );
}