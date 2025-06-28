'use client';

import { useState, useEffect } from 'react';
import { supabase, TABLE_NAMES, Product, Platform } from '../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface AnalyticsData {
  totalProducts: number;
  activeProducts: number;
  filteredProducts: number;
  amazonReadyProducts: number;
  avgProfitMargin: number;
  avgROI: number;
  totalValue: number;
  monthlyTrends: Array<{
    month: string;
    products: number;
    value: number;
    avgProfit: number;
  }>;
  platformDistribution: Array<{
    name: string;
    value: number;
    products: number;
  }>;
  profitRanges: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  conditionDistribution: Array<{
    condition: string;
    count: number;
    avgPrice: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('6months');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      const endDate = new Date();
      const startDate = dateRange === '6months' 
        ? subMonths(endDate, 6)
        : dateRange === '3months'
        ? subMonths(endDate, 3)
        : subMonths(endDate, 1);

      const [productsResponse, platformsResponse] = await Promise.all([
        supabase
          .from(TABLE_NAMES.PRODUCTS)
          .select(`
            *,
            platform:${TABLE_NAMES.PLATFORMS}(*)
          `)
          .gte('created_at', startDate.toISOString()),
        
        supabase
          .from(TABLE_NAMES.PLATFORMS)
          .select('*')
          .eq('is_active', true)
      ]);

      if (productsResponse.error) throw productsResponse.error;
      if (platformsResponse.error) throw platformsResponse.error;

      const products = productsResponse.data || [];
      const platforms = platformsResponse.data || [];

      const analytics = calculateAnalytics(products, platforms);
      setAnalyticsData(analytics);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAnalytics = (products: Product[], platforms: Platform[]): AnalyticsData => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => !p.is_filtered).length;
    const filteredProducts = products.filter(p => p.is_filtered).length;
    const amazonReadyProducts = products.filter(p => p.amazon_status === 'ready').length;

    const profitMargins = products
      .filter(p => p.amazon_profit_margin != null)
      .map(p => p.amazon_profit_margin!);
    const avgProfitMargin = profitMargins.length > 0 
      ? profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length 
      : 0;

    const rois = products
      .filter(p => p.amazon_roi != null)
      .map(p => p.amazon_roi!);
    const avgROI = rois.length > 0 
      ? rois.reduce((a, b) => a + b, 0) / rois.length 
      : 0;

    const totalValue = products
      .filter(p => p.price != null)
      .reduce((sum, p) => sum + (p.price || 0), 0);

    const monthlyTrends = generateMonthlyTrends(products);
    const platformDistribution = generatePlatformDistribution(products, platforms);
    const profitRanges = generateProfitRanges(products);
    const conditionDistribution = generateConditionDistribution(products);

    return {
      totalProducts,
      activeProducts,
      filteredProducts,
      amazonReadyProducts,
      avgProfitMargin,
      avgROI,
      totalValue,
      monthlyTrends,
      platformDistribution,
      profitRanges,
      conditionDistribution
    };
  };

  const generateMonthlyTrends = (products: Product[]) => {
    const monthlyData: { [key: string]: { products: number; value: number; profits: number[] } } = {};
    
    products.forEach(product => {
      const month = format(parseISO(product.created_at), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { products: 0, value: 0, profits: [] };
      }
      monthlyData[month].products++;
      monthlyData[month].value += product.price || 0;
      if (product.amazon_profit_margin != null) {
        monthlyData[month].profits.push(product.amazon_profit_margin);
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: format(parseISO(`${month}-01`), 'yyyy年M月'),
        products: data.products,
        value: Math.round(data.value),
        avgProfit: data.profits.length > 0 
          ? Math.round(data.profits.reduce((a, b) => a + b, 0) / data.profits.length * 100) / 100
          : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const generatePlatformDistribution = (products: Product[], platforms: Platform[]) => {
    const platformCounts: { [key: string]: { count: number; value: number } } = {};
    
    products.forEach(product => {
      const platformName = product.platform?.platform_name || '不明';
      if (!platformCounts[platformName]) {
        platformCounts[platformName] = { count: 0, value: 0 };
      }
      platformCounts[platformName].count++;
      platformCounts[platformName].value += product.price || 0;
    });

    return Object.entries(platformCounts).map(([name, data]) => ({
      name,
      value: Math.round(data.value),
      products: data.count
    }));
  };

  const generateProfitRanges = (products: Product[]) => {
    const ranges = [
      { range: '0-10%', min: 0, max: 10 },
      { range: '10-20%', min: 10, max: 20 },
      { range: '20-30%', min: 20, max: 30 },
      { range: '30-50%', min: 30, max: 50 },
      { range: '50%+', min: 50, max: Infinity }
    ];

    const total = products.filter(p => p.amazon_profit_margin != null).length;
    
    return ranges.map(range => {
      const count = products.filter(p => 
        p.amazon_profit_margin != null &&
        p.amazon_profit_margin >= range.min &&
        p.amazon_profit_margin < range.max
      ).length;
      
      return {
        range: range.range,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });
  };

  const generateConditionDistribution = (products: Product[]) => {
    const conditionCounts: { [key: string]: { count: number; totalPrice: number } } = {};
    
    products.forEach(product => {
      const condition = product.product_condition || '不明';
      if (!conditionCounts[condition]) {
        conditionCounts[condition] = { count: 0, totalPrice: 0 };
      }
      conditionCounts[condition].count++;
      conditionCounts[condition].totalPrice += product.price || 0;
    });

    return Object.entries(conditionCounts).map(([condition, data]) => ({
      condition,
      count: data.count,
      avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0
    }));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">データが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">データ分析</h1>
            <p className="text-gray-600">利益率・ROI・売上実績の可視化</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1month">1ヶ月</option>
            <option value="3months">3ヶ月</option>
            <option value="6months">6ヶ月</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">総商品数</h3>
          <p className="text-3xl font-bold text-blue-600">{analyticsData.totalProducts.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">
            有効: {analyticsData.activeProducts} / フィルタ済み: {analyticsData.filteredProducts}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">平均利益率</h3>
          <p className="text-3xl font-bold text-green-600">{analyticsData.avgProfitMargin.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Amazon出品対象商品</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">平均ROI</h3>
          <p className="text-3xl font-bold text-purple-600">{analyticsData.avgROI.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">投資収益率</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">総商品価値</h3>
          <p className="text-3xl font-bold text-orange-600">¥{analyticsData.totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Amazon準備完了: {analyticsData.amazonReadyProducts}</p>
        </div>
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 月次トレンド */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">月次トレンド</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="products" fill="#8884d8" name="商品数" />
              <Line yAxisId="right" type="monotone" dataKey="avgProfit" stroke="#82ca9d" name="平均利益率(%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* プラットフォーム分布 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">プラットフォーム別分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.platformDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="products"
              >
                {analyticsData.platformDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 利益率分布 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">利益率分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.profitRanges}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" name="商品数" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 商品状態別分析 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">商品状態別分析</h3>
          <div className="space-y-4">
            {analyticsData.conditionDistribution.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{item.condition}</span>
                  <span className="text-sm text-gray-500 ml-2">({item.count}件)</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">平均価格</div>
                  <div className="text-lg text-blue-600">¥{item.avgPrice.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}