-- 既存テーブル用の価格表とデフォルト価格範囲の一括作成SQL
-- Supabase SQL Editorで実行してください

-- 0. 既存データ確認
SELECT 
  'price_tables' as table_name, 
  COUNT(*) as count 
FROM flea_market_research_price_tables
UNION ALL
SELECT 
  'price_ranges' as table_name, 
  COUNT(*) as count 
FROM flea_market_research_price_ranges;

-- 1. 既存の同名価格表を削除（必要に応じて）
-- DELETE FROM flea_market_research_price_tables 
-- WHERE table_name IN ('メルカリ用価格表', 'ラクマ用価格表', 'ヤフオク用価格表', 'PayPayフリマ用価格表');

-- 2. メルカリ用価格表作成
WITH mercari_table AS (
  INSERT INTO flea_market_research_price_tables (
    table_name,
    description,
    is_active
  ) VALUES (
    'メルカリ用価格表',
    'メルカリ向けの固定価格設定（手数料10%対応）',
    true
  ) 
  ON CONFLICT (table_name) DO NOTHING
  RETURNING id
),

-- 2. ラクマ用価格表作成
rakuma_table AS (
  INSERT INTO flea_market_research_price_tables (
    table_name,
    description,
    is_active
  ) VALUES (
    'ラクマ用価格表',
    'ラクマ向けの固定価格設定（手数料6%対応）',
    true
  ) RETURNING id
),

-- 3. ヤフオク用価格表作成
yahoo_table AS (
  INSERT INTO flea_market_research_price_tables (
    table_name,
    description,
    is_active
  ) VALUES (
    'ヤフオク用価格表',
    'ヤフオク向けの固定価格設定（手数料8.8%対応）',
    true
  ) RETURNING id
),

-- 4. PayPayフリマ用価格表作成
paypay_table AS (
  INSERT INTO flea_market_research_price_tables (
    table_name,
    description,
    is_active
  ) VALUES (
    'PayPayフリマ用価格表',
    'PayPayフリマ向けの固定価格設定（手数料5%対応）',
    true
  ) RETURNING id
)

-- 5. デフォルト価格範囲データ作成（全プラットフォーム共通）
INSERT INTO flea_market_research_price_ranges (
  price_table_id,
  min_price,
  max_price,
  fixed_listing_price,
  profit_rate
)
SELECT 
  table_id,
  ranges.min_price,
  ranges.max_price,
  ranges.fixed_listing_price,
  NULL as profit_rate
FROM (
  SELECT id as table_id FROM mercari_table
  UNION ALL
  SELECT id as table_id FROM rakuma_table
  UNION ALL
  SELECT id as table_id FROM yahoo_table
  UNION ALL
  SELECT id as table_id FROM paypay_table
) AS tables
CROSS JOIN (
  VALUES 
    -- 価格範囲と固定出品価格（中間値の2倍）
    (0, 1000, 1000),           -- ¥0-¥1,000 → ¥1,000
    (1001, 3000, 4002),        -- ¥1,001-¥3,000 → ¥4,002
    (3001, 5000, 8002),        -- ¥3,001-¥5,000 → ¥8,002
    (5001, 10000, 15002),      -- ¥5,001-¥10,000 → ¥15,002
    (10001, 20000, 30002),     -- ¥10,001-¥20,000 → ¥30,002
    (20001, 30000, 50002),     -- ¥20,001-¥30,000 → ¥50,002
    (30001, 50000, 80002),     -- ¥30,001-¥50,000 → ¥80,002
    (50001, 100000, 150002),   -- ¥50,001-¥100,000 → ¥150,002
    (100001, 200000, 300002),  -- ¥100,001-¥200,000 → ¥300,002
    (200001, 500000, 700002),  -- ¥200,001-¥500,000 → ¥700,002
    (500001, 1000000, 1500002), -- ¥500,001-¥1,000,000 → ¥1,500,002
    (1000001, 2000000, 3000002) -- ¥1,000,001-¥2,000,000 → ¥3,000,002
) AS ranges(min_price, max_price, fixed_listing_price);

-- 6. 作成結果確認
SELECT 
  pt.table_name,
  pt.description,
  COUNT(pr.id) as price_ranges_count,
  pt.is_active,
  pt.created_at
FROM flea_market_research_price_tables pt
LEFT JOIN flea_market_research_price_ranges pr ON pt.id = pr.price_table_id
WHERE pt.created_at > NOW() - INTERVAL '1 minute'
GROUP BY pt.id, pt.table_name, pt.description, pt.is_active, pt.created_at
ORDER BY pt.table_name;