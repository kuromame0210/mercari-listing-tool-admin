-- 既存のメルカリ用価格表に100万円までの価格範囲を追加するSQL
-- Supabase SQL Editorで実行してください

-- 1. 既存の価格表IDを取得
WITH existing_table AS (
    SELECT id FROM flea_market_research_price_tables 
    WHERE name = 'メルカリ用価格表'
    LIMIT 1
)
-- 2. 100万円までの価格範囲を追加（最小価格の2倍を固定価格）
INSERT INTO flea_market_research_price_ranges (
    price_table_id,
    min_price,
    max_price,
    fixed_price,
    profit_rate,
    shipping_cost,
    platform_fee_rate
)
SELECT 
    existing_table.id,
    ranges.min_price,
    ranges.max_price,
    ranges.fixed_price,
    0,    -- profit_rate
    175,  -- shipping_cost
    10.0  -- platform_fee_rate (メルカリ)
FROM existing_table
CROSS JOIN (
    VALUES 
        -- 既存の範囲を超える部分のみ追加（100万円まで）
        (2000001, 3000000, 4000002),     -- ¥2,000,001-¥3,000,000 → ¥4,000,002
        (3000001, 4000000, 6000002),     -- ¥3,000,001-¥4,000,000 → ¥6,000,002
        (4000001, 5000000, 8000002),     -- ¥4,000,001-¥5,000,000 → ¥8,000,002
        (5000001, 6000000, 10000002),    -- ¥5,000,001-¥6,000,000 → ¥10,000,002
        (6000001, 7000000, 12000002),    -- ¥6,000,001-¥7,000,000 → ¥12,000,002
        (7000001, 8000000, 14000002),    -- ¥7,000,001-¥8,000,000 → ¥14,000,002
        (8000001, 9000000, 16000002),    -- ¥8,000,001-¥9,000,000 → ¥16,000,002
        (9000001, 10000000, 18000002)    -- ¥9,000,001-¥10,000,000 → ¥18,000,002
) AS ranges(min_price, max_price, fixed_price)
-- 重複チェック（既存の範囲と重複しないようにする）
WHERE NOT EXISTS (
    SELECT 1 FROM flea_market_research_price_ranges pr2
    WHERE pr2.price_table_id = existing_table.id
    AND pr2.min_price = ranges.min_price
);

-- しかし、実際は既存の範囲を100万円まで対応するように更新する方が良いでしょう
-- 既存の範囲を削除して、新しく100万円対応の範囲を作成

-- 3. 既存の価格範囲を削除
DELETE FROM flea_market_research_price_ranges 
WHERE price_table_id = (
    SELECT id FROM flea_market_research_price_tables WHERE name = 'メルカリ用価格表'
);

-- 4. 100万円まで対応の新しい価格範囲を作成
WITH existing_table AS (
    SELECT id FROM flea_market_research_price_tables 
    WHERE name = 'メルカリ用価格表'
    LIMIT 1
)
INSERT INTO flea_market_research_price_ranges (
    price_table_id,
    min_price,
    max_price,
    fixed_price,
    profit_rate,
    shipping_cost,
    platform_fee_rate
)
SELECT 
    existing_table.id,
    ranges.min_price,
    ranges.max_price,
    ranges.fixed_price,
    0,    -- profit_rate
    175,  -- shipping_cost
    10.0  -- platform_fee_rate
FROM existing_table
CROSS JOIN (
    VALUES 
        -- 100万円まで対応（細かく刻んだ価格範囲）
        (0, 999, 0),                     -- ¥0-¥999 → ¥0
        (1000, 2999, 2000),              -- ¥1,000-¥2,999 → ¥2,000
        (3000, 4999, 6000),              -- ¥3,000-¥4,999 → ¥6,000
        (5000, 9999, 10000),             -- ¥5,000-¥9,999 → ¥10,000
        (10000, 19999, 20000),           -- ¥10,000-¥19,999 → ¥20,000
        (20000, 29999, 40000),           -- ¥20,000-¥29,999 → ¥40,000
        (30000, 49999, 60000),           -- ¥30,000-¥49,999 → ¥60,000
        (50000, 79999, 100000),          -- ¥50,000-¥79,999 → ¥100,000
        (80000, 99999, 160000),          -- ¥80,000-¥99,999 → ¥160,000
        (100000, 149999, 200000),        -- ¥100,000-¥149,999 → ¥200,000
        (150000, 199999, 300000),        -- ¥150,000-¥199,999 → ¥300,000
        (200000, 299999, 400000),        -- ¥200,000-¥299,999 → ¥400,000
        (300000, 399999, 600000),        -- ¥300,000-¥399,999 → ¥600,000
        (400000, 499999, 800000),        -- ¥400,000-¥499,999 → ¥800,000
        (500000, 699999, 1000000),       -- ¥500,000-¥699,999 → ¥1,000,000
        (700000, 999999, 1400000),       -- ¥700,000-¥999,999 → ¥1,400,000
        (1000000, 1000000, 2000000)      -- ¥1,000,000 → ¥2,000,000
) AS ranges(min_price, max_price, fixed_price);

-- 5. 作成結果確認
SELECT 
    pt.name,
    pr.min_price,
    pr.max_price,
    pr.fixed_price,
    CASE 
        WHEN pr.min_price = 0 THEN 0
        ELSE ROUND((pr.fixed_price::numeric / pr.min_price), 1)
    END as price_multiplier,
    COUNT(*) OVER() as total_ranges
FROM flea_market_research_price_tables pt
JOIN flea_market_research_price_ranges pr ON pt.id = pr.price_table_id
WHERE pt.name = 'メルカリ用価格表'
ORDER BY pr.min_price;