-- 個別価格範囲追加用SQL
-- 使用方法: 下記の値を変更してSupabase SQL Editorで実行

-- ===== 設定値を変更してください =====
-- 価格表名（例：'メルカリ用価格表'、'ラクマ用価格表'）
\set table_name 'メルカリ用価格表'

-- 価格範囲
\set min_price 0
\set max_price 1000

-- 固定出品価格（中間値の2倍が推奨）
-- 例：min_price=0, max_price=1000 → 中間値=500 → 出品価格=1000
\set listing_price 1000
-- ===================================

-- 価格範囲追加
WITH target_table AS (
  SELECT id FROM flea_market_research_price_tables 
  WHERE table_name = :'table_name'
  LIMIT 1
)
INSERT INTO flea_market_research_price_ranges (
  price_table_id,
  min_price,
  max_price,
  fixed_listing_price,
  profit_rate
)
SELECT 
  target_table.id,
  :min_price,
  :max_price,
  :listing_price,
  NULL
FROM target_table;

-- 追加結果確認
SELECT 
  pt.table_name,
  pr.min_price,
  pr.max_price,
  pr.fixed_listing_price,
  pr.created_at
FROM flea_market_research_price_ranges pr
JOIN flea_market_research_price_tables pt ON pr.price_table_id = pt.id
WHERE pt.table_name = :'table_name'
  AND pr.created_at > NOW() - INTERVAL '1 minute'
ORDER BY pr.min_price;