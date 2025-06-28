import Image from 'next/image';
import { Product } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  compact?: boolean;
  ngSellerCodes?: Set<string>;
  ngKeywords?: string[];
  replaceBlankKeywords?: string[];
}

export default function ProductList({ 
  products, 
  compact = false, 
  ngSellerCodes = new Set(), 
  ngKeywords = [], 
  replaceBlankKeywords = [] 
}: ProductListProps) {
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

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        商品がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => {
        const profit = (product.listing_price || 0) - (product.price || 0);
        const profitRate = product.price ? ((profit / product.price) * 100) : 0;
        const firstImage = product.images?.[0];

        const ngReasons = getNGReasons(product);
        const isNGProduct = ngReasons.length > 0;
        
        return (
          <div
            key={product.id}
            className={`border rounded-lg p-4 ${
              isNGProduct ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start space-x-4">
              {/* 商品画像 */}
              <div className="flex-shrink-0">
                {firstImage ? (
                  <Image
                    src={firstImage}
                    alt={product.title || '商品画像'}
                    width={compact ? 60 : 80}
                    height={compact ? 60 : 80}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <div className={`${compact ? 'w-15 h-15' : 'w-20 h-20'} bg-gray-200 rounded-md flex items-center justify-center`}>
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>

              {/* 商品情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`${compact ? 'text-sm' : 'text-base'} font-medium text-gray-900 truncate`}>
                      {product.title || '商品名なし'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      出品者: {product.seller_name || '不明'}
                    </p>
                    
                    {/* ステータスバッジ */}
                    <div className="flex items-center space-x-2 mt-2">
                      {isNGProduct ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          NG商品
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          有効
                        </span>
                      )}
                      
                      {product.checkout_status === '売り切れました' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          売り切れ
                        </span>
                      )}
                    </div>
                    
                    {/* NG理由表示 */}
                    {isNGProduct && ngReasons.length > 0 && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-md">
                        <div className="text-xs font-medium text-red-800 mb-1">NG理由:</div>
                        <div className="space-y-1">
                          {ngReasons.map((reason, index) => (
                            <div key={index} className="text-xs text-red-700">
                              • {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 価格情報 */}
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-600">
                      仕入れ: <span className="font-medium">{formatCurrency(product.price || 0)}</span>
                    </div>
                    <div className="text-sm text-primary-600 font-medium">
                      出品予定: {formatCurrency(product.listing_price || 0)}
                    </div>
                    <div className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      利益: {formatCurrency(profit)} ({profitRate.toFixed(1)}%)
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="ml-4">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}