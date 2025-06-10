-- 既存テーブル用の価格表作成SQL
-- コピー&ペーストしてSupabase SQL Editorで実行

-- 1. 既存データ確認
SELECT 'テーブル確認' as status, COUNT(*) as count FROM flea_market_research_price_tables;

-- 2. メルカリ用価格表とデフォルト価格範囲を一括作成
DO $$
DECLARE
    table_id UUID;
    existing_count INTEGER;
BEGIN
    -- 同名の価格表が既に存在するかチェック
    SELECT COUNT(*) INTO existing_count 
    FROM flea_market_research_price_tables 
    WHERE name = 'メルカリ用価格表';
    
    IF existing_count > 0 THEN
        RAISE NOTICE '「メルカリ用価格表」は既に存在します。';
        RETURN;
    END IF;

    -- 価格表作成
    INSERT INTO flea_market_research_price_tables (
        name,
        description,
        is_active
    ) VALUES (
        'メルカリ用価格表',
        'メルカリ向けの固定価格設定（手数料10%対応）',
        true
    ) RETURNING id INTO table_id;

    -- 価格範囲一括挿入（最小価格の2倍を固定価格とする）
    INSERT INTO flea_market_research_price_ranges (
        price_table_id,
        min_price,
        max_price,
        fixed_price,
        profit_rate,
        shipping_cost,
        platform_fee_rate
    ) VALUES 
        (table_id, 0, 1000, 0, 0, 175, 10.0),                    -- ¥0-¥1,000 → ¥0
        (table_id, 1001, 3000, 2002, 0, 175, 10.0),             -- ¥1,001-¥3,000 → ¥2,002  
        (table_id, 3001, 5000, 6002, 0, 175, 10.0),             -- ¥3,001-¥5,000 → ¥6,002
        (table_id, 5001, 10000, 10002, 0, 175, 10.0),           -- ¥5,001-¥10,000 → ¥10,002
        (table_id, 10001, 20000, 20002, 0, 175, 10.0),          -- ¥10,001-¥20,000 → ¥20,002
        (table_id, 20001, 30000, 40002, 0, 175, 10.0),          -- ¥20,001-¥30,000 → ¥40,002
        (table_id, 30001, 50000, 60002, 0, 175, 10.0),          -- ¥30,001-¥50,000 → ¥60,002
        (table_id, 50001, 100000, 100002, 0, 175, 10.0),        -- ¥50,001-¥100,000 → ¥100,002
        (table_id, 100001, 200000, 200002, 0, 175, 10.0),       -- ¥100,001-¥200,000 → ¥200,002
        (table_id, 200001, 500000, 400002, 0, 175, 10.0),       -- ¥200,001-¥500,000 → ¥400,002
        (table_id, 500001, 1000000, 1000002, 0, 175, 10.0),     -- ¥500,001-¥1,000,000 → ¥1,000,002
        (table_id, 1000001, 2000000, 2000002, 0, 175, 10.0);    -- ¥1,000,001-¥2,000,000 → ¥2,000,002

    RAISE NOTICE '価格表「メルカリ用価格表」と12個の価格範囲を作成しました。';
END $$;

-- 2. 作成結果確認
SELECT 
    pt.name,
    pr.min_price,
    pr.max_price,
    pr.fixed_price,
    ROUND((pr.fixed_price::numeric / ((pr.min_price + pr.max_price) / 2) - 1) * 100, 1) as profit_rate_percent
FROM flea_market_research_price_tables pt
JOIN flea_market_research_price_ranges pr ON pt.id = pr.price_table_id
WHERE pt.name = 'メルカリ用価格表'
ORDER BY pr.min_price;