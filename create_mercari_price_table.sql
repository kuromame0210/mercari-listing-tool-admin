-- メルカリ用価格表作成（既存テーブル対応）
-- Supabase SQL Editorで実行してください

-- 1. メルカリ用価格表作成
INSERT INTO flea_market_research_price_tables (
    name,
    description,
    is_active
) VALUES (
    'メルカリ用価格表',
    'メルカリ向けの固定価格設定（手数料10%対応）',
    true
);

-- 2. 作成した価格表のIDを取得して価格範囲を追加
WITH new_table AS (
    SELECT id FROM flea_market_research_price_tables 
    WHERE name = 'メルカリ用価格表'
    ORDER BY created_at DESC 
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
    new_table.id,
    ranges.min_price,
    ranges.max_price,
    ranges.fixed_price,
    0,    -- profit_rate (デフォルト値)
    175,  -- shipping_cost (デフォルト値)
    10.0  -- platform_fee_rate (メルカリの手数料)
FROM new_table
CROSS JOIN (
    VALUES 
        (0, 1000, 0),              -- ¥0-¥1,000 → ¥0 (最小価格の2倍)
        (1001, 3000, 2002),        -- ¥1,001-¥3,000 → ¥2,002
        (3001, 5000, 6002),        -- ¥3,001-¥5,000 → ¥6,002
        (5001, 10000, 10002),      -- ¥5,001-¥10,000 → ¥10,002
        (10001, 20000, 20002),     -- ¥10,001-¥20,000 → ¥20,002
        (20001, 30000, 40002),     -- ¥20,001-¥30,000 → ¥40,002
        (30001, 50000, 60002),     -- ¥30,001-¥50,000 → ¥60,002
        (50001, 100000, 100002),   -- ¥50,001-¥100,000 → ¥100,002
        (100001, 200000, 200002),  -- ¥100,001-¥200,000 → ¥200,002
        (200001, 500000, 400002),  -- ¥200,001-¥500,000 → ¥400,002
        (500001, 1000000, 1000002), -- ¥500,001-¥1,000,000 → ¥1,000,002
        (1000001, 2000000, 2000002) -- ¥1,000,001-¥2,000,000 → ¥2,000,002
) AS ranges(min_price, max_price, fixed_price);

-- 3. 作成結果確認
SELECT 
    pt.name,
    pr.min_price,
    pr.max_price,
    pr.fixed_price,
    pr.shipping_cost,
    pr.platform_fee_rate,
    ROUND(((pr.fixed_price::numeric / ((pr.min_price + pr.max_price) / 2)) - 1) * 100, 1) as profit_rate_percent
FROM flea_market_research_price_tables pt
JOIN flea_market_research_price_ranges pr ON pt.id = pr.price_table_id
WHERE pt.name = 'メルカリ用価格表'
ORDER BY pr.min_price;