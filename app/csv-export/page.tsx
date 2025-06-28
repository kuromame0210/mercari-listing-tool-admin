'use client';

import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES, Product } from '../../lib/supabase';
import { Download, RefreshCw, ArrowLeft, FileX, Info, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function CSVExportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('exported');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showHeaders, setShowHeaders] = useState(false);

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

      if (filter === 'exported') {
        query = query.eq('csv_exported', true);
      } else if (filter === 'not_exported') {
        query = query.eq('csv_exported', false);
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
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const resetCSVStatus = async (productIds: string[]) => {
    if (productIds.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update({ 
          csv_exported: false, 
          csv_exported_at: null 
        })
        .in('id', productIds);

      if (error) throw error;

      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error) {
      console.error('CSVステータスリセットエラー:', error);
      alert('CSVステータスのリセットに失敗しました');
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Amazon Windows-31J対応の文字クリーンアップ関数
  const cleanText = (text: string): string => {
    if (!text) return '';
    return text
      // 制御文字を完全に除去（タブ、改行、復帰以外）
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Windows-31Jで問題となる特殊文字を除去・置換
      .replace(/[–—]/g, '-')  // 全角ダッシュ・EMダッシュを半角ハイフンに
      .replace(/['']/g, "'")  // スマートクォート（シングル）を普通のクォートに
      .replace(/[""]/g, '"')  // スマートクォート（ダブル）を普通のクォートに
      .replace(/[…]/g, '...')  // 三点リーダーを3つのドットに
      .replace(/[•]/g, '・')   // ビュレットを中点に
      .replace(/[®©™]/g, '')   // 商標記号を除去
      .replace(/[€£¥]/g, '')   // 通貨記号を除去（円記号以外）
      .replace(/[αβγδεζηθικλμνξοπρστυφχψω]/g, '')  // ギリシャ文字を除去
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')  // 上付き文字を除去
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '')  // 下付き文字を除去
      .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')  // 丸数字を除去
      .replace(/[㍉㌢㍍㌔㌘㌧㍑㌫㌣㌘㌻]/g, '')  // 単位記号を除去
      .replace(/[♀♂♪♫♬]/g, '')  // 記号を除去
      // 絵文字や装飾文字を除去
      .replace(/[\u{1F000}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      // 0x97問題のバイトを除去
      .replace(/[\u0097]/g, '')
      // 高位Unicode文字（Windows-31Jで表現できない）を除去
      .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
      // 連続する空白を単一空白に
      .replace(/\s+/g, ' ')
      // 前後の空白を除去
      .trim()
      // 最終的にASCII+ひらがな+カタカナ+漢字+基本記号のみを許可
      .replace(/[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF01-\uFF5E]/g, '');
  };

  const exportToXLSM = async () => {
    try {
      // Amazon公式テンプレートを読み込む（Node.jsスクリプト方式）
      const response = await fetch('/api/create-amazon-xlsm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: filteredProducts.map(product => ({
            id: product.id,
            title: product.amazon_title || product.title || '',
            brand: 'ノーブランド品',
            price: Number(product.listing_price || product.price || 0),
            images: product.images || [],
            description: product.description || '',
            condition: product.product_condition || 'Used'
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('XLSM生成APIの呼び出しに失敗しました');
      }

      // ファイルをダウンロード
      const blob = await response.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `Amazon_商品登録_${timestamp}.xlsm`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // CSVエクスポート済みにマーク
      const productIds = filteredProducts.map(p => p.id);
      if (productIds.length > 0) {
        const { error } = await supabase
          .from(TABLE_NAMES.PRODUCTS)
          .update({ 
            csv_exported: true, 
            csv_exported_at: new Date().toISOString() 
          })
          .in('id', productIds);

        if (error) {
          console.error('CSVエクスポート状態更新エラー:', error);
        } else {
          await loadProducts(); // データを再読み込み
        }
      }

      alert(`XLSMファイルが正常に作成されました: ${filename}\n商品数: ${filteredProducts.length}件`);

    } catch (error) {
      console.error('XLSM出力エラー:', error);
      alert('XLSMファイルの出力に失敗しました: ' + error.message);
    }
  };

  const exportToTSV = async () => {
    try {
      // Amazon公式テンプレートを読み込む（Node.jsスクリプト方式）
      const response = await fetch('/api/create-amazon-tsv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: filteredProducts.map(product => ({
            id: product.id,
            title: product.amazon_title || product.title || '',
            brand: 'ノーブランド品',
            price: Number(product.listing_price || product.price || 0),
            images: product.images || [],
            description: product.description || '',
            condition: product.product_condition || 'Used'
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('TSV生成APIの呼び出しに失敗しました');
      }

      // ファイルをダウンロード
      const blob = await response.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `Amazon_インベントリファイル_${timestamp}.tsv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // CSVエクスポート済みにマーク
      const productIds = filteredProducts.map(p => p.id);
      if (productIds.length > 0) {
        const { error } = await supabase
          .from(TABLE_NAMES.PRODUCTS)
          .update({ 
            csv_exported: true, 
            csv_exported_at: new Date().toISOString() 
          })
          .in('id', productIds);

        if (error) {
          console.error('CSVエクスポート状態更新エラー:', error);
        } else {
          await loadProducts(); // データを再読み込み
        }
      }

      alert(`TSVファイル（Shift_JIS形式）が正常に作成されました: ${filename}\n商品数: ${filteredProducts.length}件\n\nこのファイルはAmazonが要求するWindows-31J形式で出力されています。`);

    } catch (error) {
      console.error('TSV出力エラー:', error);
      alert('TSVファイルの出力に失敗しました: ' + error.message);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link href="/products" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600 hover:text-gray-800" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">XLSM形式ファイル出力</h1>
            <p className="text-gray-600">XLSM形式ファイル反映済み商品の管理・出力・ステータス変更</p>
          </div>
        </div>
      </div>

      {/* フィルターとアクション */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* 検索とフィルター */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="商品名・出品者で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-w-[160px]"
            >
              <option value="exported">XLSM反映済み</option>
              <option value="not_exported">XLSM未反映</option>
              <option value="all">すべて</option>
            </select>
          </div>
          
          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => resetCSVStatus(Array.from(selectedProducts))}
              disabled={selectedProducts.size === 0}
              className="flex items-center justify-center px-6 py-4 bg-orange-600 text-white text-base font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation min-w-[200px]"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              XLSM反映を解除 ({selectedProducts.size})
            </button>
            {/* <button 
              onClick={exportToXLSM}
              className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <Download className="w-5 h-5 mr-2" />
              XLSM出力 ({filteredProducts.length}件)
            </button> */}
            <button 
              onClick={exportToTSV}
              className="flex items-center justify-center px-6 py-4 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <Download className="w-5 h-5 mr-2" />
              TSV出力 ({filteredProducts.length}件)
            </button>
          </div>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '検索条件に一致する商品がありません' : '商品がありません'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleAllSelection}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer hover:border-blue-400 transition-colors"
                      />
                    </div>
                  </th>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">画像</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">XLSM反映日時</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const profit = (product.listing_price || 0) - (product.price || 0);
                  const profitRate = product.price ? ((profit / product.price) * 100) : 0;
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {/* チェックボックス */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer hover:border-blue-400 transition-colors"
                          />
                        </div>
                      </td>
                      
                      {/* 作成日時 */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(product.created_at)}
                        </div>
                      </td>
                      
                      {/* 商品画像 */}
                      <td className="px-6 py-4">
                        <div className="flex-shrink-0 h-16 w-16">
                          {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
                            <img
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200 shadow-sm"
                              src={product.images[0]}
                              alt={product.title || '商品画像'}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">画像なし</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* 商品名 */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {product.title || '商品名なし'}
                        </div>
                      </td>
                      
                      {/* 出品者 */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {product.seller_name || '不明'}
                        </div>
                      </td>
                      
                      {/* 仕入価格 */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(product.price || 0)}
                        </div>
                      </td>
                      
                      {/* 出品価格 */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-green-600">
                          {formatCurrency(product.listing_price || 0)}
                        </div>
                      </td>
                      
                      {/* 利益 */}
                      <td className="px-6 py-4">
                        <div className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <div>{formatCurrency(profit)}</div>
                          <div>({profitRate.toFixed(1)}%)</div>
                        </div>
                      </td>
                      
                      {/* XLSM反映日時 */}
                      <td className="px-6 py-4">
                        {product.csv_exported_at ? (
                          <div className="text-sm text-gray-900">
                            {formatDateTime(product.csv_exported_at)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">未反映</span>
                        )}
                      </td>
                      
                      {/* アクション */}
                      <td className="px-6 py-4">
                        <div className="flex space-x-1">
                          {product.csv_exported ? (
                            <button
                              onClick={() => resetCSVStatus([product.id])}
                              className="inline-flex items-center px-4 py-3 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md min-w-[100px] justify-center"
                              title="XLSM反映を解除して未反映に戻す"
                            >
                              <RefreshCw className="w-5 h-5 mr-2" />
                              解除
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-4 py-3 text-sm text-gray-400 bg-gray-50 rounded-lg min-w-[100px] justify-center">未反映</span>
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

      {/* Amazonヘッダー情報 */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Info className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Amazon XLSM出力項目</h3>
          </div>
          <button
            onClick={() => setShowHeaders(!showHeaders)}
            className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {showHeaders ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                非表示
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                192項目を表示
              </>
            )}
          </button>
        </div>
        
        {showHeaders && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {[
                '商品タイプ', '出品者SKU', 'ブランド名', '商品名', '商品コード(JANコード等)', '商品コードのタイプ', 'メーカー名', '推奨ブラウズノード',
                'アダルト商品', '在庫数', '商品の販売価格', '商品メイン画像URL', '対象性別', '商品のサブ画像URL1', '商品のサブ画像URL2', '商品のサブ画像URL3',
                '商品のサブ画像URL4', '商品のサブ画像URL5', '商品のサブ画像URL6', '商品のサブ画像URL7', '商品のサブ画像URL8', 'カラーサンプル画像URL',
                '親子関係の指定', 'バリエーションテーマ', '親商品のSKU(商品管理番号)', '親子関係のタイプ', 'アップデート・削除', 'メーカー型番',
                '商品説明文', 'お取り扱い上の注意', 'お取り扱い上の注意', 'お取り扱い上の注意', '対応言語', '型番', '版', '商品の仕様', '商品の仕様',
                '商品の仕様', '商品の仕様', '商品の仕様', '検索キーワード', 'メーカー推奨最少年齢の単位', 'メーカー推奨最高年齢の単位', '組み立て方法',
                '要組み立て', '組み立て時間の単位', '組み立て時間', '折りたたみ時のサイズ', '素材の種類', '機能性', '機能性', '機能性', '機能性',
                '機能性', 'サイズ', 'カラー', 'カラーマップ', '商品の個数（ピース数）', 'エンジンタイプ', '推奨使用用途', 'コレクション名', 'ジャンル',
                '電池の説明', 'リチウム電池エネルギー含有量', '出品者カタログ番号', 'プラチナキーワード', 'プラチナキーワード', 'プラチナキーワード',
                'プラチナキーワード', 'プラチナキーワード', 'スタイル名', 'リチウム電池の電圧の測定単位', 'ターゲットユーザーのキーワード',
                'ターゲットユーザーのキーワード', 'ターゲットユーザーのキーワード', 'ターゲットユーザーのキーワード', 'ターゲットユーザーのキーワード',
                'shaft_style_type', 'コントローラタイプ', 'メーカー推奨最少年齢', 'メーカー推奨最高年齢', 'キャラクター', '素材構成', 'スケール名',
                'レールの規格', '有線or無線', 'サポート周波数帯域', '教育目標', '配送重量', '発送重量の単位', 'メーカー推奨最低重量',
                'メーカー推奨最少体重の単位', 'メーカー推奨最大重量', 'メーカー推奨最大体重の単位', 'メーカー推奨最小身長', '推奨最低身長の単位',
                'メーカー推奨最大身長', '推奨最高身長の単位', 'サイズマップ', 'ハンドルの高さ', 'ハンドルの高さの単位', 'シートの幅',
                '座面（椅子）の幅の単位', '商品の高さ', '商品の長さ', '商品の幅', '商品の重量（パッケージを含まない）', '商品の重量の単位',
                '商品の長さ', '商品の長さの単位', '商品の寸法の単位', 'フルフィルメントセンターID', '商品パッケージの長さ', '商品パッケージの幅',
                '商品パッケージの高さ', '商品パッケージの重量', '商品パッケージの重量の単位', '商品パッケージの寸法の単位', '法規上の免責条項',
                '安全性の注意点', 'メーカー保証の説明', '製造国/地域', '原産国/地域', '特徴・用途', '電池付属',
                'この商品は電池本体ですか？または電池を使用した商品ですか？', '電池の種類、サイズ', '電池の種類、サイズ', '電池の種類、サイズ',
                '電池の数', '電池の数', '電池の数', '電池当たりのワット時', 'リチウムイオン電池単数', 'リチウムメタル電池単数',
                'リチウム含有量(グラム)', 'リチウム電池パッケージ', '商品の重量', '商品の重量の単位', '電池の組成', '電池の重量(グラム)',
                '電池の重量の測定単位', 'リチウム電池のエネルギー量測定単位', 'リチウム電池の重量の測定単位', '適用される危険物関連法令',
                '適用される危険物関連法令', '適用される危険物関連法令', '適用される危険物関連法令', '適用される危険物関連法令', '国連(UN)番号',
                '安全データシート(SDS) URL', '商品の体積', '商品の容量の単位', '引火点(°C)', '分類／危険物ラベル(適用されるものをすべて選択)',
                '分類／危険物ラベル(適用されるものをすべて選択)', '分類／危険物ラベル(適用されるものをすべて選択)', '出荷作業日数', 'コンディション',
                '商品のコンディション説明', '商品の公開日', '予約商品の販売開始日', '商品の入荷予定日', '使用しない支払い方法', '配送日時指定SKUリスト',
                'セール価格', 'セール開始日', 'セール終了日', 'パッケージ商品数', 'メーカー希望価格', '付属品総数', 'ギフト包装',
                'ギフトメッセージ', '最大注文個数', 'メーカー製造中止', '終了日を提案する', '商品タックスコード', '配送パターン',
                '賞味期限管理商品', '販売形態(並行輸入品)', '開始日を提案する', 'ポイントパーセント', 'セール時ポイントパーセント'
              ].map((header, index) => (
                <div key={index} className="p-2 bg-white rounded border text-gray-700 hover:bg-blue-50 transition-colors">
                  <span className="text-xs text-gray-500 mr-2">{index + 1}.</span>
                  {header}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-1" />
                このXLSMファイルはAmazonセラーセントラルに直接インポート可能な形式です。
                必須項目は自動で設定され、商品データが適切にマッピングされます。
              </p>
            </div>
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
              {filteredProducts.filter(p => p.csv_exported).length}
            </div>
            <div className="text-sm text-gray-600">XLSM反映済み</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredProducts.filter(p => !p.csv_exported).length}
            </div>
            <div className="text-sm text-gray-600">XLSM未反映</div>
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