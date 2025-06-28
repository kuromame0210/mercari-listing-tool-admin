import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLE_NAMES } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 新品以外の商品をフィルタ済みに更新開始...');

    // 新品以外の商品を is_filtered = true に更新
    const { data, error } = await supabase
      .from(TABLE_NAMES.PRODUCTS)
      .update({ 
        is_filtered: true
      })
      .neq('product_condition', '新品、未使用')
      .eq('is_filtered', false); // 現在フィルタ済みでない商品のみ

    if (error) {
      console.error('❌ 新品以外フィルタリングエラー:', error);
      throw error;
    }

    console.log('✅ 新品以外フィルタリング完了:', data);

    return NextResponse.json({ 
      success: true, 
      message: `新品以外の商品をフィルタ済みに更新しました`,
      data: data
    });

  } catch (error) {
    console.error('新品以外フィルタリングAPI エラー:', error);
    return NextResponse.json(
      { error: '新品以外の商品のフィルタリングに失敗しました' }, 
      { status: 500 }
    );
  }
}