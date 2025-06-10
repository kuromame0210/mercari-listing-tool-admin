-- 固定出品価格を100万円まで対応するように変更するSQL
-- 既存のメルカリ用価格表を更新します

-- ===== 既存の価格範囲を削除して、100万円対応の新しい範囲を作成 =====

-- 1. 既存の価格範囲を全削除
DELETE FROM flea_market_research_price_ranges 
WHERE price_table_id = (
    SELECT id FROM flea_market_research_price_tables WHERE name = 'メルカリ用価格表'
);

-- 2. 100万円まで対応の新しい価格範囲を作成（最小価格の2倍を固定価格）
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
        -- 新しい価格表データ適用
        (0, 1000, 3980),                 -- No.1: ～1,000 → 3,980
        (1001, 2000, 4980),              -- No.2: 1,001～2,000 → 4,980
        (2001, 3000, 6980),              -- No.3: 2,001～3,000 → 6,980
        (3001, 4000, 8980),              -- No.4: 3,001～4,000 → 8,980
        (4001, 5000, 9980),              -- No.5: 4,001～5,000 → 9,980
        (5001, 6000, 12980),             -- No.6: 5,001～6,000 → 12,980
        (6001, 7000, 14980),             -- No.7: 6,001～7,000 → 14,980
        (7001, 8000, 16980),             -- No.8: 7,001～8,000 → 16,980
        (8001, 9000, 18980),             -- No.9: 8,001～9,000 → 18,980
        (9001, 10000, 19980),            -- No.10: 9,001～10,000 → 19,980
        (10001, 11000, 23980),           -- No.11: 10,001～11,000 → 23,980
        (11001, 12000, 24980),           -- No.12: 11,001～12,000 → 24,980
        (12001, 13000, 25980),           -- No.13: 12,001～13,000 → 25,980
        (13001, 14000, 27980),           -- No.14: 13,001～14,000 → 27,980
        (14001, 15000, 29980),           -- No.15: 14,001～15,000 → 29,980
        (15001, 16000, 33980),           -- No.16: 15,001～16,000 → 33,980
        (16001, 17000, 33980),           -- No.17: 16,001～17,000 → 33,980
        (17001, 18000, 35980),           -- No.18: 17,001～18,000 → 35,980
        (18001, 19000, 37980),           -- No.19: 18,001～19,000 → 37,980
        (19001, 20000, 39980),           -- No.20: 19,001～20,000 → 39,980
        (20001, 21000, 41980),           -- No.21: 20,001～21,000 → 41,980
        (21001, 22000, 43980),           -- No.22: 21,001～22,000 → 43,980
        (22001, 23000, 45980),           -- No.23: 22,001～23,000 → 45,980
        (23001, 24000, 47980),           -- No.24: 23,001～24,000 → 47,980
        (24001, 25000, 49980),           -- No.25: 24,001～25,000 → 49,980
        (25001, 26000, 52000),           -- No.26: 25,001～26,000 → 52,000
        (26001, 27000, 54000),           -- No.27: 26,001～27,000 → 54,000
        (27001, 28000, 56000),           -- No.28: 27,001～28,000 → 56,000
        (28001, 29000, 58000),           -- No.29: 28,001～29,000 → 58,000
        (29001, 30000, 60000),           -- No.30: 29,001～30,000 → 60,000
        (30001, 40000, 80000),           -- No.31: 30,001～40,000 → 80,000
        (40001, 50000, 100000),          -- No.32: 40,001～50,000 → 100,000
        (50001, 60000, 120000),          -- No.33: 50,001～60,000 → 120,000
        (60001, 70000, 140000),          -- No.34: 60,001～70,000 → 140,000
        (70001, 80000, 160000),          -- No.35: 70,001～80,000 → 160,000
        (80001, 90000, 210000),          -- No.36: 80,001～90,000 → 210,000
        (90001, 100000, 220000),         -- No.37: 90,001～100,000 → 220,000
        (100001, 120000, 199800),        -- No.38: 100,001～120,000 → 199,800
        (120001, 150000, 249800),        -- No.39: 120,001～150,000 → 249,800
        (150001, 200000, 298000),        -- No.40: 150,001～200,000 → 298,000
        (200001, 300000, 450000),        -- No.41: 200,001～300,000 → 450,000
        (300001, 500000, 798000),        -- No.42: 300,001～500,000 → 798,000
        (500001, 700000, 900000),        -- No.43: 500,001～700,000 → 900,000
        (700001, 900000, 1200000)        -- No.44: 700,001～900,000 → 1,200,000
) AS ranges(min_price, max_price, fixed_price);

-- 変更結果確認
SELECT 
    pt.name as price_table_name,
    pr.min_price,
    pr.max_price,
    pr.fixed_price,
    CASE 
        WHEN pr.min_price = 0 THEN 0
        ELSE ROUND((pr.fixed_price::numeric / pr.min_price), 1)
    END as price_multiplier,
    pr.created_at
FROM flea_market_research_price_tables pt
JOIN flea_market_research_price_ranges pr ON pt.id = pr.price_table_id
WHERE pt.name = 'メルカリ用価格表'
ORDER BY pr.min_price;

-- 個別の価格範囲を変更する場合のテンプレート
-- UPDATE flea_market_research_price_ranges 
-- SET fixed_price = [新しい価格]
-- WHERE price_table_id = (
--     SELECT id FROM flea_market_research_price_tables WHERE name = '[価格表名]'
-- ) AND min_price = [最小価格] AND max_price = [最大価格];

-- 全ての価格範囲を最小価格の3倍に設定する場合
-- UPDATE flea_market_research_price_ranges 
-- SET fixed_price = CASE 
--     WHEN min_price = 0 THEN 1000  -- 0円は特別に1000円
--     ELSE min_price * 3
-- END
-- WHERE price_table_id = (
--     SELECT id FROM flea_market_research_price_tables WHERE name = 'メルカリ用価格表'
-- );