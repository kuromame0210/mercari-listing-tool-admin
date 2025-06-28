import { NextRequest, NextResponse } from 'next/server';
import * as iconv from 'iconv-lite';

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();

    // Amazon Windows-31J対応の文字クリーンアップ関数
    const cleanText = (text: string): string => {
      if (!text) return '';
      return text
        // 制御文字を完全に除去（タブ、改行、復帰以外）
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Windows-31Jで問題となる特殊文字を除去・置換
        .replace(/[–—]/g, '-')  // 全角ダッシュ・EMダッシュを半角ハイフンに
        .replace(/['']/g, "'")  // スマートクォート（シングル）を普通のクォートに
        .replace(/[""]/g, '"')  // スマートクォート（ダブル）を普通のクォートに
        .replace(/[…]/g, '...')  // 三点リーダーを3つのドットに
        .replace(/[•]/g, '・')   // ビュレットを中点に
        .replace(/[®©™]/g, '')   // 商標記号を除去
        .replace(/[€£¥]/g, '')   // 通貨記号を除去（円記号以外）
        .replace(/[αβγδεζηθικλμνξοπρστυφχψω]/g, '')  // ギリシャ文字を除去
        .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')  // 上付き文字を除去
        .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, '')  // 下付き文字を除去
        .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')  // 丸数字を除去
        .replace(/[㍉㌢㍍㌔㌘㌧㍑㌫㌣㌘㌻]/g, '')  // 単位記号を除去
        .replace(/[♀♂♪♫♬]/g, '')  // 記号を除去
        // 絵文字や装飾文字を除去
        .replace(/[\u{1F000}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        // 0x97問題のバイトを除去
        .replace(/[\u0097]/g, '')
        // 高位Unicode文字（Windows-31Jで表現できない）を除去
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
        // 連続する空白を単一空白に
        .replace(/\s+/g, ' ')
        // 前後の空白を除去
        .trim()
        // 最終的にASCII+ひらがな+カタカナ+漢字+基本記号のみを許可
        .replace(/[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F\uFF01-\uFF5E]/g, '');
    };

    // Amazonテンプレートのメタデータ行（1行目）
    const templateMetadata = 'TemplateType=fptcustom\tVersion=2021.1014\tTemplateSignature=SE9CQklFUw==\tsettings=contentLanguageTag=ja_JP&feedType=113&headerLanguageTag=ja_JP&metadataVersion=MatprodVkxBUHJvZC0xMTQy&primaryMarketplaceId=amzn1.mp.o.A1VC38T7YXB528&templateIdentifier=cca55ff5-5779-45c9-9542-d673ea3c913a&timestamp=2021-10-14T02%3A37%3A46.123Z\t上3行はAmazon.comのみで使用します。上3行は変更または削除しないでください。\t\t\t\t\t\t\t\t\t画像\t\t\t\t\t\t\t\t\tバリエーション\t\t\t\t商品基本情報\t\t\t\t\t\t\t\t\t商品検索情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t推奨ブラウズノード別の情報\t\t\t\t\t\t\t\t\t寸法\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t出荷関連情報\t\t\t\t\t\t\tコンプライアンス情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t出品情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t';

    // 日本語ヘッダー（2行目）
    const japaneseHeaders = '商品タイプ\t出品者SKU\tブランド名\t商品名\t商品コード(JANコード等)\t商品コードのタイプ\tメーカー名\t推奨ブラウズノード\tアダルト商品\t在庫数\t商品の販売価格\t商品メイン画像URL\t対象性別\t商品のサブ画像URL1\t商品のサブ画像URL2\t商品のサブ画像URL3\t商品のサブ画像URL4\t商品のサブ画像URL5\t商品のサブ画像URL6\t商品のサブ画像URL7\t商品のサブ画像URL8\tカラーサンプル画像URL\t親子関係の指定\tバリエーションテーマ\t親商品のSKU(商品管理番号)\t親子関係のタイプ\tアップデート・削除\tメーカー型番\t商品説明文\tお取り扱い上の注意\tお取り扱い上の注意\tお取り扱い上の注意\t対応言語\t型番\t版\t商品の仕様\t商品の仕様\t商品の仕様\t商品の仕様\t商品の仕様\t検索キーワード\tメーカー推奨最少年齢の単位\tメーカー推奨最高年齢の単位\t組み立て方法\t要組み立て\t組み立て時間の単位\t組み立て時間\t折りたたみ時のサイズ\t素材の種類\t機能性\t機能性\t機能性\t機能性\t機能性\tサイズ\tカラー\tカラーマップ\t商品の個数（ピース数）\tエンジンタイプ\t推奨使用用途\tコレクション名\tジャンル\t電池の説明\tリチウム電池エネルギー含有量\t出品者カタログ番号\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tスタイル名\tリチウム電池の電圧の測定単位\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tshaft_style_type\tコントローラタイプ\tメーカー推奨最少年齢\tメーカー推奨最高年齢\tキャラクター\t素材構成\tスケール名\tレールの規格\t有線or無線\tサポート周波数帯域\t教育目標\t配送重量\t発送重量の単位\tメーカー推奨最低重量\tメーカー推奨最少体重の単位\tメーカー推奨最大重量\tメーカー推奨最大体重の単位\tメーカー推奨最小身長\t推奨最低身長の単位\tメーカー推奨最大身長\t推奨最高身長の単位\tサイズマップ\tハンドルの高さ\tハンドルの高さの単位\tシートの幅\t座面（椅子）の幅の単位\t商品の高さ\t商品の長さ\t商品の幅\t商品の重量（パッケージを含まない）\t商品の重量の単位\t商品の長さ\t商品の長さの単位\t商品の寸法の単位\tフルフィルメントセンターID\t商品パッケージの長さ\t商品パッケージの幅\t商品パッケージの高さ\t商品パッケージの重量\t商品パッケージの重量の単位\t商品パッケージの寸法の単位\t法規上の免責条項\t安全性の注意点\tメーカー保証の説明\t製造国/地域\t原産国/地域\t特徴・用途\t電池付属\tこの商品は電池本体ですか？または電池を使用した商品ですか？\t電池の種類、サイズ\t電池の種類、サイズ\t電池の種類、サイズ\t電池の数\t電池の数\t電池の数\t電池当たりのワット時\tリチウムイオン電池単数\tリチウムメタル電池単数\tリチウム含有量(グラム)\tリチウム電池パッケージ\t商品の重量\t商品の重量の単位\t電池の組成\t電池の重量(グラム)\t電池の重量の測定単位\tリチウム電池のエネルギー量測定単位\tリチウム電池の重量の測定単位\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t国連(UN)番号\t安全データシート(SDS) URL\t商品の体積\t商品の容量の単位\t引火点(°C)\t分類／危険物ラベル(適用されるものをすべて選択)\t分類／危険物ラベル(適用されるものをすべて選択)\t分類／危険物ラベル(適用されるものをすべて選択)\t出荷作業日数\tコンディション\t商品のコンディション説明\t商品の公開日\t予約商品の販売開始日\t商品の入荷予定日\t使用しない支払い方法\t配送日時指定SKUリスト\tセール価格\tセール開始日\tセール終了日\tパッケージ商品数\tメーカー希望価格\t付属品総数\tギフト包装\tギフトメッセージ\t最大注文個数\tメーカー製造中止\t終了日を提案する\t商品タックスコード\t配送パターン\t賞味期限管理商品\t販売形態(並行輸入品)\t開始日を提案する\tポイントパーセント\tセール時ポイントパーセント';

    // 英語フィールド名（3行目）
    const englishHeaders = 'feed_product_type\titem_sku\tbrand_name\titem_name\texternal_product_id\texternal_product_id_type\tmanufacturer\trecommended_browse_nodes\tis_adult_product\tquantity\tstandard_price\tmain_image_url\ttarget_gender\tother_image_url1\tother_image_url2\tother_image_url3\tother_image_url4\tother_image_url5\tother_image_url6\tother_image_url7\tother_image_url8\tswatch_image_url\tparent_child\tvariation_theme\tparent_sku\trelationship_type\tupdate_delete\tpart_number\tproduct_description\tcare_instructions1\tcare_instructions2\tcare_instructions3\tlanguage_value\tmodel\tedition\tbullet_point1\tbullet_point2\tbullet_point3\tbullet_point4\tbullet_point5\tgeneric_keywords\tmfg_minimum_unit_of_measure\tmfg_maximum_unit_of_measure\tassembly_instructions\tis_assembly_required\tassembly_time_unit_of_measure\tassembly_time\tfolded_size\tmaterial_type\tspecial_features1\tspecial_features2\tspecial_features3\tspecial_features4\tspecial_features5\tsize_name\tcolor_name\tcolor_map\tnumber_of_pieces\tengine_type\trecommended_uses_for_product\tcollection_name\tgenre\tbattery_description\tlithium_battery_voltage\tcatalog_number\tplatinum_keywords1\tplatinum_keywords2\tplatinum_keywords3\tplatinum_keywords4\tplatinum_keywords5\tstyle_name\tlithium_battery_voltage_unit_of_measure\ttarget_audience_keywords1\ttarget_audience_keywords2\ttarget_audience_keywords3\ttarget_audience_keywords4\ttarget_audience_keywords5\tshaft_style_type\tcontroller_type\tmfg_minimum\tmfg_maximum\tsubject_character\tmaterial_composition\tscale_name\trail_gauge\tremote_control_technology\tfrequency_bands_supported\teducational_objective\twebsite_shipping_weight\twebsite_shipping_weight_unit_of_measure\tminimum_weight_recommendation\tminimum_weight_recommendation_unit_of_measure\tmaximum_weight_recommendation\tmaximum_weight_recommendation_unit_of_measure\tminimum_height_recommendation\tminimum_height_recommendation_unit_of_measure\tmaximum_height_recommendation\tmaximum_height_recommendation_unit_of_measure\tsize_map\thandle_height\thandle_height_unit_of_measure\tseat_width\tseat_width_unit_of_measure\titem_height\titem_length\titem_width\titem_display_weight\titem_display_weight_unit_of_measure\titem_display_length\titem_display_length_unit_of_measure\titem_dimensions_unit_of_measure\tfulfillment_center_id\tpackage_length\tpackage_width\tpackage_height\tpackage_weight\tpackage_weight_unit_of_measure\tpackage_dimensions_unit_of_measure\tlegal_disclaimer_description\tsafety_warning\twarranty_description\tcountry_string\tcountry_of_origin\tspecific_uses_for_product\tare_batteries_included\tbatteries_required\tbattery_type1\tbattery_type2\tbattery_type3\tnumber_of_batteries1\tnumber_of_batteries2\tnumber_of_batteries3\tlithium_battery_energy_content\tnumber_of_lithium_ion_cells\tnumber_of_lithium_metal_cells\tlithium_battery_weight\tlithium_battery_packaging\titem_weight\titem_weight_unit_of_measure\tbattery_cell_composition\tbattery_weight\tbattery_weight_unit_of_measure\tlithium_battery_energy_content_unit_of_measure\tlithium_battery_weight_unit_of_measure\tsupplier_declared_dg_hz_regulation1\tsupplier_declared_dg_hz_regulation2\tsupplier_declared_dg_hz_regulation3\tsupplier_declared_dg_hz_regulation4\tsupplier_declared_dg_hz_regulation5\thazmat_united_nations_regulatory_id\tsafety_data_sheet_url\titem_volume\titem_volume_unit_of_measure\tflash_point\tghs_classification_class1\tghs_classification_class2\tghs_classification_class3\tfulfillment_latency\tcondition_type\tcondition_note\tproduct_site_launch_date\tmerchant_release_date\trestock_date\toptional_payment_type_exclusion\tdelivery_schedule_group_id\tsale_price\tsale_from_date\tsale_end_date\titem_package_quantity\tlist_price\tnumber_of_items\toffering_can_be_giftwrapped\toffering_can_be_gift_messaged\tmax_order_quantity\tis_discontinued_by_manufacturer\toffering_end_date\tproduct_tax_code\tmerchant_shipping_group_name\tis_expiration_dated_product\tdistribution_designation\toffering_start_date\tstandard_price_points_percent\tsale_price_points_percent';

    // データをAmazonフォーマットに変換
    const csvData = products.map((product: any) => {
      // コンディションのマッピング
      const conditionMapping: Record<string, string> = {
        '新品、未使用': '新品',
        '未使用に近い': '中古 - ほぼ新品',
        '目立った傷や汚れなし': '中古 - 非常に良い',
        'やや傷や汚れあり': '中古 - 良い',
        '傷や汚れあり': '中古 - 許容可能',
        '全体的に状態が悪い': '中古 - 許容可能'
      };
      
      const condition = conditionMapping[product.condition || ''] || '中古 – 良い';
      
      // Amazonフィールドにマッピングしたデータを作成
      const amazonData = new Array(183).fill(''); // 183はAmazonテンプレートのフィールド数（成功版XLSMと同じ）
      
      // 必須フィールドを設定
      amazonData[0] = 'Hobbies'; // feed_product_type（成功版XLSMと同じ）
      amazonData[1] = cleanText(product.id || ''); // item_sku
      amazonData[2] = 'ノーブランド品'; // brand_name
      amazonData[3] = cleanText(product.title || ''); // item_name
      amazonData[4] = ''; // external_product_id
      amazonData[5] = ''; // external_product_id_type
      amazonData[6] = 'ノーブランド品'; // manufacturer
      amazonData[7] = '3113755051'; // recommended_browse_nodes（ホビー・アイドルグッズ、成功版XLSMと同じ）
      amazonData[8] = 'FALSE'; // is_adult_product
      amazonData[9] = 1; // quantity（数値型）
      const price = Number(product.price || 0);
      amazonData[10] = price > 0 ? price : 100; // standard_price（数値型、最低100円）
      amazonData[11] = product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : ''; // main_image_url
      amazonData[12] = ''; // target_gender
      // サブ画像 (13-20)
      if (product.images && Array.isArray(product.images)) {
        for (let i = 1; i < Math.min(product.images.length, 9); i++) {
          amazonData[12 + i] = product.images[i] || '';
        }
      }
      amazonData[26] = 'Update'; // update_delete
      amazonData[27] = cleanText(product.id || ''); // part_number（SKUと同じ値を設定してエラー対策）
      amazonData[28] = cleanText(product.description || '').replace(/\n/g, ' '); // product_description
      // 成功版XLSMと同じフィールド位置に修正
      amazonData[157] = 10; // fulfillment_latency（出荷作業日数）
      amazonData[158] = condition; // condition_type（コンディション）
      amazonData[159] = cleanText(product.description || '中古品です。写真をご確認ください。'); // condition_note（商品のコンディション説明）
      // セール日付フィールドは明示的に空文字にする（90112エラー対策）
      amazonData[166] = ''; // sale_from_date（セール開始日）
      amazonData[167] = ''; // sale_end_date（セール終了日）  
      amazonData[168] = 1; // item_package_quantity（パッケージ商品数/unit_count）- 99001エラー対策
      
      return amazonData;
    });

    // タブ区切りテキスト形式で作成
    const tsvContent = [
      templateMetadata,
      japaneseHeaders,
      englishHeaders,
      ...csvData.map(row => row.join('\t'))
    ].join('\r\n');

    // Shift_JIS（Windows-31J）エンコーディングでバイナリデータを生成
    const shiftJisBuffer = iconv.encode(tsvContent, 'shift_jis');

    // TSVファイルとしてバイナリデータを返す
    return new NextResponse(shiftJisBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values;charset=shift_jis',
        'Content-Disposition': 'attachment; filename="Amazon_inventory.tsv"',
      },
    });

  } catch (error) {
    console.error('Amazon TSV creation API error:', error);
    return NextResponse.json(
      { error: 'Failed to create Amazon TSV file' }, 
      { status: 500 }
    );
  }
}