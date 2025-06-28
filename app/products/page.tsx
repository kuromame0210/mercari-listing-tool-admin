'use client';

import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES, Product } from '../../lib/supabase';
import { Package, Filter, ExternalLink, Edit, Trash2, Download, FileCheck, FileOutput, X } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('valid');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [sortField, setSortField] = useState<'created_at' | 'product_condition'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [ngKeywords, setNgKeywords] = useState<string[]>([]);
  const [replaceBlankKeywords, setReplaceBlankKeywords] = useState<string[]>([]);

  useEffect(() => {
    loadNGKeywords();
    // デバッグ: Budweiserが存在するかデータベースを直接チェック
    checkBudweiserInDB();
  }, []);

  async function checkBudweiserInDB() {
    try {
      console.log('🔍 データベース直接検索テスト...');
      console.log('🔍 Supabaseクライアント:', supabase);
      console.log('🔍 テーブル名:', TABLE_NAMES.NG_KEYWORDS);
      
      // Nike関連の直接検索（制限なし）
      const { data: nikeData, error: nikeError } = await supabase
        .from(TABLE_NAMES.NG_KEYWORDS)
        .select('keyword, filter_type, is_active')
        .or('keyword.ilike.%nike%,keyword.like.%ナイキ%')
        .limit(100);
      
      console.log('📋 Nike直接検索結果:', nikeData, nikeError);
      
      // アクティブなデータの総数を確認
      const { count: activeCount, error: activeError } = await supabase
        .from(TABLE_NAMES.NG_KEYWORDS)
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      console.log('📊 アクティブなNGワード総数:', activeCount, activeError);
      
      // 全データ数確認
      const { count, error: countError } = await supabase
        .from(TABLE_NAMES.NG_KEYWORDS)
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 テーブル総レコード数:', count, countError);
      
    } catch (error) {
      console.error('データベース直接検索エラー:', error);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [filter, sortField, sortOrder]);

  // NGワードが読み込まれたときに商品を再読み込み
  useEffect(() => {
    if (ngKeywords.length > 0) {
      console.log('🔄 NGワード読み込み完了後に商品再読み込み');
      loadProducts();
    }
  }, [ngKeywords]);

  async function loadNGKeywords() {
    try {
      console.log('🔄 新NGワードシステム読み込み開始...');
      
      // すべてのアクティブなNGワードを取得（RLSを考慮してページネーション）
      console.log('🔍 Supabaseクエリ実行中...');
      
      let allData = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const ngResult = await supabase
          .from(TABLE_NAMES.NG_KEYWORDS)
          .select('keyword, filter_type')
          .eq('is_active', true)
          .range(from, from + pageSize - 1);
        
        // ページごとのログは削除（最初と最後のみ）
        if (from === 0) {
          console.log(`🔍 ページネーション開始: ${ngResult.data?.length || 0}件取得`);
        }
        
        if (ngResult.error) {
          console.error('🔍 クエリエラー:', ngResult.error);
          break;
        }
        
        if (!ngResult.data || ngResult.data.length === 0) {
          break;
        }
        
        allData = allData.concat(ngResult.data);
        
        // Nike関連チェック（発見時のみログ）
        const nikeInPage = ngResult.data.filter(item => 
          item.keyword && (item.keyword.toLowerCase().includes('nike') || item.keyword.includes('ナイキ'))
        );
        if (nikeInPage.length > 0) {
          console.log(`✅ Nike発見 (ページ${Math.floor(from/pageSize) + 1}):`, nikeInPage);
        }
        
        if (ngResult.data.length < pageSize) {
          break; // 最後のページ
        }
        
        from += pageSize;
      }
      
      console.log('🔍 全ページ読み込み完了 - 総件数:', allData.length);
      const ngResult = { data: allData, error: null };
      
      if (!ngResult.error && ngResult.data) {
        console.log('🔍 クエリ結果 - 総件数:', ngResult.data.length);
        console.log('🔍 データベースから取得した生データ（最初5件）:', ngResult.data.slice(0, 5));
        
        // Nike関連データの詳細確認
        const nikeData = ngResult.data.filter(item => 
          item.keyword && (item.keyword.toLowerCase().includes('nike') || item.keyword.includes('ナイキ'))
        );
        console.log('🔍 Nike関連の生データ（', nikeData.length, '件）:', nikeData);
        
        // テーブル名とクエリの確認
        console.log('🔍 使用テーブル名:', TABLE_NAMES.NG_KEYWORDS);
        console.log('🔍 クエリエラー:', ngResult.error);
        
        // exclude タイプのNGワード（商品除外用）
        const excludeKeywords = ngResult.data
          .filter(item => item.filter_type === 'exclude')
          .map(item => item.keyword);
        setNgKeywords(excludeKeywords);
        
        // replace_blank タイプのNGワード（文字削除用）
        const replaceBlankList = ngResult.data
          .filter(item => item.filter_type === 'replace_blank')
          .map(item => item.keyword);
        setReplaceBlankKeywords(replaceBlankList);
        
        console.log('✅ NGワード読み込み完了: 除外', excludeKeywords.length, '件 | 文字削除', replaceBlankList.length, '件');
        console.log('🔍 【重要】Nike関連NGワード:', excludeKeywords.filter(k => k.toLowerCase().includes('nike') || k.includes('ナイキ')));
        
        // Nike関連が0件の場合は詳細調査
        const nikeRelated = excludeKeywords.filter(k => k.toLowerCase().includes('nike') || k.includes('ナイキ'));
        if (nikeRelated.length === 0) {
          console.log('⚠️ Nike関連NGワードが0件！データベース再確認が必要');
          console.log('🔍 全NGワード（サンプル）:', excludeKeywords.slice(0, 20));
        }
      } else {
        console.error('NGワード読み込みエラー:', ngResult.error);
        setNgKeywords([]);
        setReplaceBlankKeywords([]);
      }
      
    } catch (error) {
      console.error('NGワード取得エラー:', error);
    }
  }

  // NGワードチェック関数（Chrome拡張機能と同じロジック）
  function checkForNGKeywords(title: string, description: string): { isNG: boolean; matchedKeywords: string[] } {
    // 1. タイトルクリーニング（replace_blank）
    let cleanedTitle = title || '';
    for (const replaceKeyword of replaceBlankKeywords) {
      if (replaceKeyword) {
        // 特殊文字をエスケープして正確にマッチング
        const escapedKeyword = replaceKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKeyword, 'g');
        cleanedTitle = cleanedTitle.replace(regex, '');
      }
    }
    
    // 2. 除外判定（exclude）
    const combinedText = `${cleanedTitle} ${description || ''}`.toLowerCase();
    const matchedKeywords: string[] = [];

    // デバッグ: ナイキを含む商品の場合のみ簡潔にログ出力
    if (combinedText.includes('ナイキ') || combinedText.includes('nike') || combinedText.includes('コルテッツ') || title.includes('Cortez')) {
      console.log('🔍 Nike商品NGチェック:', title);
      console.log('📋 NGワード数:', ngKeywords.length, '| Nike含有:', ngKeywords.includes('Nike'), ngKeywords.includes('NIKE'), ngKeywords.includes('ナイキ'));
      console.log('🔍 Nike関連:', ngKeywords.filter(k => k.toLowerCase().includes('nike') || k.includes('ナイキ')));
    }

    for (const keyword of ngKeywords) {
      if (keyword) {
        const keywordLower = keyword.toLowerCase();
        if (combinedText.includes(keywordLower)) {
          matchedKeywords.push(keyword);
        }
      }
    }

    const result = {
      isNG: matchedKeywords.length > 0,
      matchedKeywords
    };

    // デバッグ: Budweiserの結果をログ出力
    if (combinedText.includes('budweiser')) {
      console.log('🚫 Budweiser NGチェック結果:', result);
    }

    return result;
  }

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
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (filter === 'valid') {
        query = query
          .eq('is_filtered', false)
          .neq('seller_name', '取得予定')
          .neq('seller_name', '取得失敗')
          .neq('product_condition', '取得予定')
          .neq('product_condition', '取得失敗');
      } else if (filter === 'filtered') {
        query = query.eq('is_filtered', true);
      } else if (filter === 'ng_sellers') {
        // NG出品者の商品のみ表示（クエリはすべて取得して後でフィルタ）
        // 後でngSellerCodesでフィルタリングする
      } else if (filter === 'amazon_ready') {
        query = query.eq('amazon_status', 'ready');
      } else if (filter === 'csv_exported') {
        query = query.eq('csv_exported', true);
      } else if (filter === 'csv_not_exported') {
        query = query.eq('csv_exported', false);
      } else if (filter === 'incomplete_data') {
        // 取得未完了のデータを表示
        query = query.or('seller_name.eq.取得予定,seller_name.eq.取得失敗,product_condition.eq.取得予定,product_condition.eq.取得失敗');
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

  // NG出品者IDを取得（フィルタ済み商品の出品者ID）
  const ngSellerCodes = new Set(
    products
      .filter(p => p.is_filtered === true && p.seller_code)
      .map(p => p.seller_code)
  );

  // 表示用商品リスト
  const displayProducts = (() => {
    console.log('🔍 現在のフィルタ:', filter);
    console.log('📊 filteredProducts数:', filteredProducts.length);
    console.log('📊 NGワード読み込み状況:', ngKeywords.length, '件');
    
    // NGワードがまだ読み込まれていない場合は空配列を返す
    if (filter === 'valid' && ngKeywords.length === 0) {
      console.log('⏳ NGワード読み込み待ち...');
      return [];
    }
    
    // Budweiser商品をデバッグ
    const budweiserProducts = filteredProducts.filter(p => 
      p.title?.toLowerCase().includes('budweiser')
    );
    
    if (budweiserProducts.length > 0) {
      console.log('🍺 Budweiser商品詳細:');
      budweiserProducts.forEach(product => {
        console.log(`- ID: ${product.id}`);
        console.log(`- タイトル: ${product.title}`);
        console.log(`- is_filtered: ${product.is_filtered}`);
        console.log(`- seller_code: ${product.seller_code}`);
        console.log(`- NGSellerCodesに含まれる: ${product.seller_code ? ngSellerCodes.has(product.seller_code) : 'N/A'}`);
        
        // NGワードチェック
        const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
        console.log(`- NGワードチェック結果: ${ngCheck.isNG}, マッチしたキーワード: ${ngCheck.matchedKeywords.join(', ')}`);
      });
    }
    
    switch (filter) {
      case 'valid':
        // 有効商品（フィルタ済み、NG出品者、NGワードを除外）
        console.log('🔧 有効商品フィルタ開始...');
        const validProducts = filteredProducts.filter(product => {
          // Nike商品の場合は詳細ログ
          const isNikeProduct = product.title?.toLowerCase().includes('nike') || product.title?.includes('ナイキ');
          if (isNikeProduct) {
            console.log(`🔍 Nike商品フィルタチェック: ${product.title.substring(0, 50)}...`);
          }
          
          // 1. データベースレベルでフィルタ済みを除外
          if (product.is_filtered) {
            if (isNikeProduct) console.log(`❌ DB is_filtered=true で除外`);
            return false;
          }
          
          // 2. NG出品者を除外
          if (product.seller_code && ngSellerCodes.has(product.seller_code)) {
            if (isNikeProduct) console.log(`❌ NG出品者で除外`);
            return false;
          }
          
          // 3. NGワードチェック
          const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
          if (ngCheck.isNG) {
            // Nike商品以外は簡潔にログ
            if (isNikeProduct || product.title?.includes('Nike')) {
              console.log(`🚫 NGワードで除外: ${product.title}, マッチしたキーワード: ${ngCheck.matchedKeywords.join(', ')}`);
            }
            return false;
          } else if (isNikeProduct) {
            console.log(`⚠️ Nike商品がNGワードチェックを通過！NGチェック結果:`, ngCheck);
          }
          
          // 4. 新品以外を除外
          if (product.product_condition !== '新品、未使用') {
            if (isNikeProduct) console.log(`❌ 新品以外で除外: ${product.product_condition}`);
            return false;
          }
          
          if (isNikeProduct) {
            console.log(`✅ Nike商品が有効商品として通過してしまった！`);
          }
          
          return true;
        });
        console.log('✅ Valid商品数:', validProducts.length);
        return validProducts;
      case 'new_only':
        // 新品・未使用のみ（シンプルフィルタ：NG出品者・NGワード・新品未使用のみ）
        console.log('🔧 新品・未使用フィルタ開始...');
        const newOnlyProducts = filteredProducts.filter(product => {
          // 1. 新品・未使用のみ
          if (product.product_condition !== '新品、未使用') {
            return false;
          }
          
          // 2. NG出品者を除外
          if (product.seller_code && ngSellerCodes.has(product.seller_code)) {
            return false;
          }
          
          // 3. NGワードチェック
          const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
          if (ngCheck.isNG) {
            return false;
          }
          
          return true;
        });
        console.log('✅ 新品・未使用商品数:', newOnlyProducts.length);
        return newOnlyProducts;
      case 'ng_products':
        // 真のNG商品のみ表示（NGワード・NG出品者・データベースでフィルタ済み）
        const ngProducts = filteredProducts.filter(product => {
          // 1. データベースレベルでフィルタ済み
          if (product.is_filtered) return true;
          
          // 2. NG出品者の商品
          if (product.seller_code && ngSellerCodes.has(product.seller_code)) return true;
          
          // 3. NGワードにマッチする商品
          const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
          if (ngCheck.isNG) return true;
          
          // 価格や商品状態による自動フィルターは含めない
          return false;
        });
        console.log('🗑️ 真のNG商品数:', ngProducts.length);
        return ngProducts;
      case 'auto_filtered':
        // 自動フィルター商品（価格・商品状態による）
        const autoFilteredProducts = filteredProducts.filter(product => {
          // 既にNGワードや出品者でフィルター済みは除外
          if (product.is_filtered) return false;
          if (product.seller_code && ngSellerCodes.has(product.seller_code)) return false;
          const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
          if (ngCheck.isNG) return false;
          
          // 自動フィルター条件
          // 1. 新品以外の商品
          if (product.product_condition !== '新品、未使用') return true;
          
          // 2. 1万円以下の商品
          if (!product.price || product.price < 10000) return true;
          
          return false;
        });
        console.log('⚙️ 自動フィルター対象商品数:', autoFilteredProducts.length);
        return autoFilteredProducts;
      case 'ng_sellers':
        // NG出品者の商品のみ（フィルタ済みでない商品）
        const ngSellerProducts = filteredProducts.filter(product => 
          !product.is_filtered && 
          product.seller_code && 
          ngSellerCodes.has(product.seller_code)
        );
        console.log('🚫 NG出品者商品数:', ngSellerProducts.length);
        return ngSellerProducts;
      default:
        console.log('📋 全商品数:', filteredProducts.length);
        return filteredProducts;
    }
  })();

  // フィルタ済み商品またはNG出品者商品、NGワード商品のチェック
  const hasFilteredProducts = Array.from(selectedProducts).some(productId => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    // 既存のフィルタチェック
    if (product.is_filtered === true) return true;
    if (product.seller_code && ngSellerCodes.has(product.seller_code)) return true;
    
    // NGワードチェック
    const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
    if (ngCheck.isNG) {
      console.log(`商品 "${product.title}" でNGワード検出: ${ngCheck.matchedKeywords.join(', ')}`);
      return true;
    }
    
    
    return false;
  });

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

  // NG理由を判定する関数
  const getNGReasons = (product: Product): string[] => {
    const reasons: string[] = [];
    
    // 1. データベースレベルでフィルタ済み
    if (product.is_filtered) {
      reasons.push('データベースでフィルタ済み');
    }
    
    // 2. NG出品者
    if (product.seller_code && ngSellerCodes.has(product.seller_code)) {
      reasons.push('NG出品者');
    }
    
    // 3. NGワードチェック
    if (ngKeywords.length > 0) {
      const title = product.title || '';
      const description = product.description || '';
      
      // replace_blank キーワードを除去
      let cleanTitle = title;
      let cleanDescription = description;
      replaceBlankKeywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        cleanTitle = cleanTitle.replace(regex, '');
        cleanDescription = cleanDescription.replace(regex, '');
      });
      
      const fullText = `${cleanTitle} ${cleanDescription}`.toLowerCase();
      const matchedKeywords = ngKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        reasons.push(`NGワード: ${matchedKeywords.join(', ')}`);
      }
    }
    
    // 4. 新品以外
    if (product.product_condition !== '新品、未使用') {
      reasons.push(`商品状態: ${product.product_condition || '不明'}`);
    }
    
    // 5. 価格が低い（1万円以下）
    if (product.price && product.price < 10000) {
      reasons.push(`低価格: ${formatCurrency(product.price)}`);
    }
    
    return reasons;
  };

  const getStatusBadge = (product: Product) => {
    const ngReasons = getNGReasons(product);
    const isNGProduct = ngReasons.length > 0;
    
    if (isNGProduct) {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            NG商品
          </span>
          {ngReasons.length > 0 && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-1">
              <div className="font-medium mb-1">NG理由:</div>
              {ngReasons.map((reason, index) => (
                <div key={index}>• {reason}</div>
              ))}
            </div>
          )}
        </div>
      );
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

  const bulkDeleteProducts = async () => {
    if (selectedProducts.size === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .delete()
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      setProducts(products.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('一括削除エラー:', error);
      alert('商品の一括削除に失敗しました');
    }
  };

  const bulkDeleteAllNGProducts = async () => {
    const ngProductIds = displayProducts.map(p => p.id);
    
    if (ngProductIds.length === 0) {
      return;
    }

    const confirmed = confirm(`${ngProductIds.length}件のNG商品を削除しますか？\n\n含まれる商品:\n- フィルタ済み商品\n- NG出品者の商品\n- NGワードを含む商品\n\nこの操作は取り消せません。`);
    
    if (!confirmed) {
      return;
    }

    try {
      console.log('🗑️ NG商品一括削除開始:', ngProductIds.length, '件');
      
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .delete()
        .in('id', ngProductIds);

      if (error) throw error;

      // ローカル状態を更新
      setProducts(products.filter(p => !ngProductIds.includes(p.id)));
      setSelectedProducts(new Set());
      
      alert(`${ngProductIds.length}件のNG商品を削除しました`);
      console.log('✅ NG商品一括削除完了');
    } catch (error) {
      console.error('NG商品一括削除エラー:', error);
      alert('NG商品の一括削除に失敗しました');
    }
  };

  const toggleSort = (field: 'created_at' | 'product_condition') => {
    if (sortField === field) {
      // 同じフィールドの場合は順序を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 異なるフィールドの場合は新しいフィールドに変更し、デフォルトの順序に設定
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc'); // 作成日時は新しい順、状態は昇順がデフォルト
    }
  };

  const markAsCSVExported = async (productIds: string[]) => {
    if (productIds.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update({ 
          csv_exported: true, 
          csv_exported_at: new Date().toISOString() 
        })
        .in('id', productIds);

      if (error) throw error;

      // 成功した場合、選択状態をクリアして商品リストを再読み込み
      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error) {
      console.error('CSV反映ステータス更新エラー:', error);
      alert('CSV反映ステータスの更新に失敗しました');
    }
  };

  const filterNonNewProducts = async () => {
    if (!confirm('新品以外の商品をすべてフィルタ済みにしますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/filter-non-new-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('新品以外フィルタリング失敗');
      }

      const result = await response.json();
      alert(result.message || '新品以外の商品をフィルタ済みにしました');
      
      // 商品リストを再読み込み
      await loadProducts();
    } catch (error) {
      console.error('新品以外フィルタリングエラー:', error);
      alert('新品以外の商品のフィルタリングに失敗しました');
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
    if (selectedProducts.size === displayProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(displayProducts.map(p => p.id)));
    }
  };

  // 無効な文字を除去する関数
  const sanitizeText = (text: string): string => {
    if (!text) return '';
    return text
      // 制御文字を除去
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // ダブルクオートをエスケープ
      .replace(/"/g, '""')
      // 改行をスペースに変換
      .replace(/[\r\n]/g, ' ')
      // 連続するスペースを一つに
      .replace(/\s+/g, ' ')
      .trim();
  };


  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">商品管理</h1>
        <p className="text-gray-600">フリマサイトから収集した商品データの表示・編集・Amazon出品準備</p>
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
              <option value="all">すべて</option>
              <option value="valid">有効商品</option>
              <option value="new_only">新品・未使用のみ</option>
              <option value="filtered">フィルタ済み</option>
              <option value="ng_products">NG商品</option>
              <option value="auto_filtered">自動フィルター商品</option>
              <option value="ng_sellers">NG出品者の商品</option>
              <option value="incomplete_data">取得未完了</option>
              <option value="amazon_ready">Amazon準備完了</option>
              <option value="csv_exported">CSV反映済み</option>
              <option value="csv_not_exported">CSV未反映</option>
            </select>
          </div>
          
          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => markAsCSVExported(Array.from(selectedProducts))}
              disabled={selectedProducts.size === 0 || hasFilteredProducts}
              className="flex items-center justify-center px-6 py-4 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
              title={hasFilteredProducts ? "フィルタ済み商品、NG出品者、NGワード商品は反映できません" : ""}
            >
              <FileCheck className="w-5 h-5 mr-2" />
              CSV反映 ({selectedProducts.size})
              {hasFilteredProducts && <span className="ml-2 text-xs">⚠️</span>}
            </button>
            <button 
              onClick={filterNonNewProducts}
              className="flex items-center justify-center px-6 py-4 bg-orange-600 text-white text-base font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <Filter className="w-5 h-5 mr-2" />
              新品以外をフィルタ
            </button>
            {filter === 'ng_products' ? (
              <button 
                onClick={bulkDeleteAllNGProducts}
                disabled={displayProducts.length === 0}
                className="flex items-center justify-center px-6 py-4 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
              >
                <X className="w-5 h-5 mr-2" />
                全てのNG商品を削除 ({displayProducts.length})
              </button>
            ) : (
              <button 
                onClick={bulkDeleteProducts}
                disabled={selectedProducts.size === 0}
                className="flex items-center justify-center px-6 py-4 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
              >
                <X className="w-5 h-5 mr-2" />
                一括削除 ({selectedProducts.size})
              </button>
            )}
            {/* <Link
              href="/csv-export"
              className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white text-base font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <FileOutput className="w-5 h-5 mr-2" />
              XLSM出力
            </Link> */}
          </div>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : displayProducts.length === 0 ? (
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
                    onClick={() => toggleSort('created_at')}
                  >
                    <div className="flex items-center">
                      作成日時
                      <span className="ml-1">
                        {sortField === 'created_at' ? (sortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">画像</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品者</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => toggleSort('product_condition')}
                  >
                    <div className="flex items-center">
                      状態
                      <span className="ml-1">
                        {sortField === 'product_condition' ? (sortOrder === 'desc' ? '↓' : '↑') : '⇅'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プラットフォーム</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayProducts.map((product) => {
                  const profit = (product.listing_price || 0) - (product.price || 0);
                  const profitRate = product.price ? ((profit / product.price) * 100) : 0;
                  const isEditing = editingId === product.id;
                  
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
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {formatDateTime(product.created_at).formatted}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDateTime(product.created_at).relative}
                          </div>
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
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {product.seller_name || '不明'}
                            </div>
                            {product.seller_code && (
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {product.seller_code}
                                {ngSellerCodes.has(product.seller_code) && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    NG出品者
                                  </span>
                                )}
                              </div>
                            )}
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
                      
                      {/* CSVステータス */}
                      <td className="px-6 py-4">
                        {product.csv_exported ? (
                          <div className="text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              反映済み
                            </span>
                            {product.csv_exported_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(product.csv_exported_at).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => markAsCSVExported([product.id])}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
                            title="CSVに反映"
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            反映
                          </button>
                        )}
                      </td>
                      
                      {/* プラットフォーム */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.platform?.platform_name || 'メルカリ'}
                      </td>
                      
                      {/* アクション */}
                      <td className="px-6 py-4">
                        <div className="flex space-x-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                title="保存"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                title="キャンセル"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                title="元のページを開く"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                              <button
                                onClick={() => startEdit(product)}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                title="編集"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4 mr-1 inline" />
                                削除
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">
              {filteredProducts.filter(p => p.csv_exported).length}
            </div>
            <div className="text-sm text-gray-600">CSV反映済み</div>
          </div>
        </div>
      </div>
    </div>
  );
}