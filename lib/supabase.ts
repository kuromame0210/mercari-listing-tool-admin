import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase環境変数が設定されていません。デモモードで動作します。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// テーブル名定義
export const TABLE_NAMES = {
  PLATFORMS: 'flea_market_research_platforms',
  PRODUCTS: 'flea_market_research_products',
  PRICE_TABLES: 'flea_market_research_price_tables',
  PRICE_RANGES: 'flea_market_research_price_ranges',
  AMAZON_CATEGORIES: 'flea_market_research_amazon_categories',
  NG_KEYWORDS: 'flea_market_research_ng_keywords',
  NG_SELLERS: 'flea_market_research_ng_sellers',
  // 後方互換性のため（将来削除予定）
  KEYWORD_FILTERS: 'flea_market_research_ng_keywords',
} as const;

// 型定義
export interface Platform {
  id: string;
  platform_code: string;
  platform_name: string;
  base_url: string;
  is_active: boolean;
  platform_fee_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  platform_id: string;
  url: string;
  product_id?: string;
  title?: string;
  price?: number;
  seller_name?: string;
  seller_code?: string;
  product_condition?: string;
  description?: string;
  images?: string[];
  checkout_status?: string;
  listing_price?: number;
  is_filtered: boolean;
  platform_specific_data?: any;
  
  // Amazon出品用フィールド
  amazon_title?: string;
  amazon_description?: string;
  amazon_brand?: string;
  amazon_manufacturer?: string;
  amazon_model?: string;
  amazon_category?: string;
  amazon_subcategory?: string;
  amazon_condition?: string;
  amazon_condition_note?: string;
  amazon_keywords?: string;
  amazon_bullet_point_1?: string;
  amazon_bullet_point_2?: string;
  amazon_bullet_point_3?: string;
  amazon_bullet_point_4?: string;
  amazon_bullet_point_5?: string;
  amazon_item_weight?: number;
  amazon_package_weight?: number;
  amazon_dimensions?: string;
  amazon_package_dimensions?: string;
  amazon_color?: string;
  amazon_size?: string;
  amazon_material?: string;
  amazon_target_audience?: string;
  amazon_quantity?: number;
  amazon_handling_time?: number;
  amazon_fulfillment_channel?: string;
  amazon_main_image_url?: string;
  amazon_other_image_urls?: string;
  amazon_external_product_id?: string;
  amazon_external_product_id_type?: string;
  amazon_variation_theme?: string;
  amazon_parent_child?: string;
  amazon_relationship_type?: string;
  amazon_parent_sku?: string;
  amazon_feed_product_type?: string;
  amazon_recommended_browse_nodes?: string;
  amazon_launch_date?: string;
  amazon_discontinue_date?: string;
  amazon_max_order_quantity?: number;
  amazon_sale_price?: number;
  amazon_sale_start_date?: string;
  amazon_sale_end_date?: string;
  amazon_tax_code?: string;
  amazon_gift_wrap_available?: boolean;
  amazon_gift_message_available?: boolean;
  amazon_is_discontinued?: boolean;
  amazon_status?: 'draft' | 'ready' | 'uploaded' | 'active' | 'error';
  amazon_error_message?: string;
  amazon_sku?: string;
  amazon_listing_id?: string;
  amazon_last_uploaded_at?: string;
  amazon_profit_margin?: number;
  amazon_roi?: number;
  
  // CSV出力関連フィールド
  csv_exported?: boolean;
  csv_exported_at?: string;
  
  created_at: string;
  updated_at: string;
  
  // JOIN用
  platform?: Platform;
}

export interface KeywordFilter {
  id: number;
  keyword: string;
  filter_type: 'exclude' | 'replace_blank';
  is_active: boolean;
  original_text?: string;
  source: 'manual' | 'csv_import';
  created_at: string;
  updated_at?: string;
}

// 旧KeywordFilterインターフェース（削除予定）
export interface LegacyKeywordFilter {
  id: string;
  platform_id: string;
  keyword: string;
  filter_type: 'exclude' | 'include';
  is_active: boolean;
  created_at: string;
  platform?: Platform;
}

export interface PriceTable {
  id: string;
  platform_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  price_ranges?: PriceRange[];
  platform?: Platform;
}

export interface PriceRange {
  id: string;
  price_table_id: string;
  min_price: number;
  max_price?: number;
  fixed_price?: number;
  profit_rate: number;
  shipping_cost: number;
  platform_fee_rate: number;
  created_at: string;
}

export interface AmazonCategory {
  id: string;
  category_name: string;
  browse_node_id?: string;
  parent_category_id?: string;
  feed_product_type?: string;
  required_attributes?: any;
  recommended_attributes?: any;
  category_path?: string;
  commission_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmazonListingStatus {
  status: string;
  count: number;
}

export interface AmazonProfitAnalysis {
  id: string;
  title: string;
  source_price: number;
  amazon_price: number;
  profit_margin_percent: number;
  profit_amount: number;
  amazon_status: string;
  amazon_category: string;
  source_platform: string;
}