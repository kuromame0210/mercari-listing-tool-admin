'use client';

import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES, Product, AmazonListingStatus } from '../lib/supabase';
import { Package, TrendingUp, Filter, DollarSign, ShoppingCart, Globe } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import ProductList from '../components/ProductList';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    filtered: 0,
    avgProfit: 0,
    amazonReady: 0,
    amazonActive: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [amazonStats, setAmazonStats] = useState<AmazonListingStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRecentProducts();
    loadAmazonStats();
  }, []);

  async function loadStats() {
    try {
      console.log('📊 統計データ取得開始...');
      
      // 総商品数
      const { count: total } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('*', { count: 'exact', head: true });

      console.log('総商品数:', total);

      // 有効商品数
      const { count: valid } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('is_filtered', false);

      console.log('有効商品数:', valid);

      // フィルタ済み商品数
      const { count: filtered } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('is_filtered', true);

      console.log('フィルタ済み商品数:', filtered);

      // 平均利益計算
      const { data: profitData } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('price, listing_price')
        .eq('is_filtered', false)
        .not('listing_price', 'is', null)
        .not('price', 'is', null)
        .limit(100);

      const avgProfit = profitData?.length
        ? profitData.reduce((sum, p) => sum + ((p.listing_price || 0) - (p.price || 0)), 0) / profitData.length
        : 0;

      // Amazon準備完了数
      const { count: amazonReady } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('amazon_status', 'ready');

      console.log('Amazon準備完了数:', amazonReady);

      // Amazon出品中数
      const { count: amazonActive } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select('*', { count: 'exact', head: true })
        .eq('amazon_status', 'active');

      console.log('Amazon出品中数:', amazonActive);

      const finalStats = {
        total: total || 0,
        valid: valid || 0,
        filtered: filtered || 0,
        avgProfit,
        amazonReady: amazonReady || 0,
        amazonActive: amazonActive || 0,
      };

      console.log('最終統計データ:', finalStats);
      setStats(finalStats);
    } catch (error) {
      console.error('統計データ取得エラー:', error);
    }
  }

  async function loadAmazonStats() {
    try {
      console.log('📈 Amazon統計データ取得開始...');
      const { data, error } = await supabase
        .from('amazon_listing_status')
        .select('*');

      if (error) {
        console.warn('Amazon統計ビューが存在しません:', error);
        setAmazonStats([]);
        return;
      }
      
      console.log('Amazon統計データ:', data);
      setAmazonStats(data || []);
    } catch (error) {
      console.error('Amazon統計データ取得エラー:', error);
      setAmazonStats([]);
    }
  }

  async function loadRecentProducts() {
    try {
      console.log('🛍️ 商品データ取得開始...');
      const { data, error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select(`
          *,
          platform:platform_id (
            platform_name,
            platform_code
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      console.log('商品データクエリ結果:', { data, error });

      if (error) throw error;
      
      console.log('設定する商品データ:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('商品データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ダッシュボード</h1>
        <p className="text-gray-600">フリマサイトリサーチツール - Amazon出品対応</p>
        <div className="text-sm text-blue-600 mt-2">
          デバッグ: 商品数={products.length}, 読み込み中={loading.toString()}, 統計={stats.total}
        </div>
      </div>

      {/* フリマサイト統計カード */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          フリマサイト収集状況
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="総商品数"
            value={stats.total.toLocaleString()}
            icon={Package}
            color="bg-blue-500"
          />
          <StatsCard
            title="有効商品"
            value={stats.valid.toLocaleString()}
            icon={TrendingUp}
            color="bg-green-500"
          />
          <StatsCard
            title="フィルタ済み"
            value={stats.filtered.toLocaleString()}
            icon={Filter}
            color="bg-yellow-500"
          />
          <StatsCard
            title="平均利益"
            value={formatCurrency(Math.round(stats.avgProfit))}
            icon={DollarSign}
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Amazon統計カード */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          Amazon出品状況
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="出品準備完了"
            value={stats.amazonReady.toLocaleString()}
            icon={Package}
            color="bg-orange-500"
          />
          <StatsCard
            title="出品中"
            value={stats.amazonActive.toLocaleString()}
            icon={ShoppingCart}
            color="bg-green-600"
          />
          {amazonStats.slice(0, 2).map((stat) => (
            <StatsCard
              key={stat.status}
              title={stat.status}
              value={stat.count.toLocaleString()}
              icon={TrendingUp}
              color="bg-indigo-500"
            />
          ))}
        </div>
      </div>

      {/* 最近の商品 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近収集した商品</h2>
          <a href="/products" className="btn-primary btn-sm">
            すべて見る
          </a>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">商品データがありません</div>
        ) : (
          <div>
            <div className="text-sm text-gray-600 mb-4">商品数: {products.length}件</div>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="p-4 border rounded-lg bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{product.title}</h3>
                      <p className="text-sm text-gray-600">出品者: {product.seller_name}</p>
                      <p className="text-sm text-gray-600">プラットフォーム: {product.platform?.platform_name || 'メルカリ'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">仕入れ: ¥{product.price?.toLocaleString()}</div>
                      <div className="text-sm text-green-600">出品: ¥{product.listing_price?.toLocaleString()}</div>
                      <div className="text-sm font-medium">利益: ¥{((product.listing_price || 0) - (product.price || 0)).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}