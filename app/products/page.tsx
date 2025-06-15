'use client';

import { useEffect, useState } from 'react';
import { supabase, TABLE_NAMES, Product } from '../../lib/supabase';
import { Package, Filter, ExternalLink, Edit, Trash2, Download, FileCheck, FileOutput, X } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('valid');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [ngKeywords, setNgKeywords] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
    loadNGKeywords();
  }, [filter, sortOrder]);

  async function loadNGKeywords() {
    try {
      const { data, error } = await supabase
        .from('ng_keywords')
        .select('keyword');

      if (error) throw error;
      setNgKeywords(data?.map(item => item.keyword.toLowerCase()) || []);
    } catch (error) {
      console.error('NGキーワード取得エラー:', error);
    }
  }

  // NGワードチェック関数
  function checkForNGKeywords(title: string, description: string): { isNG: boolean; matchedKeywords: string[] } {
    const searchText = `${title || ''} ${description || ''}`.toLowerCase();
    const matchedKeywords: string[] = [];

    for (const keyword of ngKeywords) {
      if (searchText.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    return {
      isNG: matchedKeywords.length > 0,
      matchedKeywords
    };
  }

  async function loadProducts() {
    try {
      setLoading(true);
      let query = supabase
        .from(TABLE_NAMES.PRODUCTS)
        .select(`
          *,
          platform:platform_id (
            platform_name,
            platform_code
          )
        `)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (filter === 'valid') {
        query = query.eq('is_filtered', false);
      } else if (filter === 'filtered') {
        query = query.eq('is_filtered', true);
      } else if (filter === 'ng_sellers') {
        // NG出品者の商品のみ表示（クエリはすべて取得して後でフィルタ）
        // 後でngSellerCodesでフィルタリングする
      } else if (filter === 'amazon_ready') {
        query = query.eq('amazon_status', 'ready');
      } else if (filter === 'csv_exported') {
        query = query.eq('csv_exported', true);
      } else if (filter === 'csv_not_exported') {
        query = query.eq('csv_exported', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('商品データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // NG出品者IDを取得（フィルタ済み商品の出品者ID）
  const ngSellerCodes = new Set(
    products
      .filter(p => p.is_filtered === true && p.seller_code)
      .map(p => p.seller_code)
  );

  // 表示用商品リスト
  const displayProducts = (() => {
    switch (filter) {
      case 'valid':
        // 有効商品（フィルタ済みもNG出品者も除外）
        return filteredProducts.filter(product => 
          !product.is_filtered && 
          (!product.seller_code || !ngSellerCodes.has(product.seller_code))
        );
      case 'ng_sellers':
        // NG出品者の商品のみ（フィルタ済みでない商品）
        return filteredProducts.filter(product => 
          !product.is_filtered && 
          product.seller_code && 
          ngSellerCodes.has(product.seller_code)
        );
      default:
        return filteredProducts;
    }
  })();

  // フィルタ済み商品またはNG出品者商品、NGワード商品のチェック
  const hasFilteredProducts = Array.from(selectedProducts).some(productId => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;
    
    // 既存のフィルタチェック
    if (product.is_filtered === true) return true;
    if (product.seller_code && ngSellerCodes.has(product.seller_code)) return true;
    
    // NGワードチェック
    const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
    if (ngCheck.isNG) {
      console.log(`商品 "${product.title}" でNGワード検出: ${ngCheck.matchedKeywords.join(', ')}`);
      return true;
    }
    
    return false;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const formatted = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    
    // 相対時間も計算
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let relative = '';
    if (diffDays > 0) {
      relative = `${diffDays}日前`;
    } else if (diffHours > 0) {
      relative = `${diffHours}時間前`;
    } else {
      relative = '1時間以内';
    }
    
    return { formatted, relative };
  };

  const getStatusBadge = (product: Product) => {
    if (product.is_filtered) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">フィルタ済み</span>;
    }
    
    switch (product.amazon_status) {
      case 'ready':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">出品準備完了</span>;
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">出品中</span>;
      case 'uploaded':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">アップロード済み</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">下書き</span>;
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditingProduct({
      title: product.title,
      seller_name: product.seller_name,
      product_condition: product.product_condition,
      price: product.price,
      listing_price: product.listing_price,
      amazon_title: product.amazon_title,
      amazon_status: product.amazon_status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingProduct({});
  };

  const saveEdit = async (productId: string) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update(editingProduct)
        .eq('id', productId);

      if (error) throw error;

      // 商品リストを更新
      setProducts(products.map(p => 
        p.id === productId ? { ...p, ...editingProduct } : p
      ));

      setEditingId(null);
      setEditingProduct({});
    } catch (error) {
      console.error('商品更新エラー:', error);
      alert('商品の更新に失敗しました');
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('商品削除エラー:', error);
      alert('商品の削除に失敗しました');
    }
  };

  const bulkDeleteProducts = async () => {
    if (selectedProducts.size === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .delete()
        .in('id', Array.from(selectedProducts));

      if (error) throw error;

      setProducts(products.filter(p => !selectedProducts.has(p.id)));
      setSelectedProducts(new Set());
    } catch (error) {
      console.error('一括削除エラー:', error);
      alert('商品の一括削除に失敗しました');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const markAsCSVExported = async (productIds: string[]) => {
    if (productIds.length === 0) {
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update({ 
          csv_exported: true, 
          csv_exported_at: new Date().toISOString() 
        })
        .in('id', productIds);

      if (error) throw error;

      // 成功した場合、選択状態をクリアして商品リストを再読み込み
      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error) {
      console.error('CSV反映ステータス更新エラー:', error);
      alert('CSV反映ステータスの更新に失敗しました');
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedProducts.size === displayProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(displayProducts.map(p => p.id)));
    }
  };

  // 無効な文字を除去する関数
  const sanitizeText = (text: string): string => {
    if (!text) return '';
    return text
      // 制御文字を除去
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      // ダブルクオートをエスケープ
      .replace(/"/g, '""')
      // 改行をスペースに変換
      .replace(/[\r\n]/g, ' ')
      // 連続するスペースを一つに
      .replace(/\s+/g, ' ')
      .trim();
  };

  const exportToCSV = async () => {
    try {
      // Amazonテンプレートのメタデータ行（1行目）
      const templateMetadata = 'TemplateType=fptcustom\tVersion=2021.1014\tTemplateSignature=SE9CQklFUw==\tsettings=contentLanguageTag=ja_JP&feedType=113&headerLanguageTag=ja_JP&metadataVersion=MatprodVkxBUHJvZC0xMTQy&primaryMarketplaceId=amzn1.mp.o.A1VC38T7YXB528&templateIdentifier=cca55ff5-5779-45c9-9542-d673ea3c913a&timestamp=2021-10-14T02%3A37%3A46.123Z\t上3行はAmazon.comのみで使用します。上3行は変更または削除しないでください。\t\t\t\t\t\t\t\t\t画像\t\t\t\t\t\t\t\t\tバリエーション\t\t\t\t商品基本情報\t\t\t\t\t\t\t\t\t商品検索情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t推奨ブラウズノード別の情報\t\t\t\t\t\t\t\t\t寸法\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t出荷関連情報\t\t\t\t\t\t\tコンプライアンス情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t出品情報\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t'

      // 日本語ヘッダー（2行目）
      const japaneseHeaders = '商品タイプ\t出品者SKU\tブランド名\t商品名\t商品コード(JANコード等)\t商品コードのタイプ\tメーカー名\t推奨ブラウズノード\tアダルト商品\t在庫数\t商品の販売価格\t商品メイン画像URL\t対象性別\t商品のサブ画像URL1\t商品のサブ画像URL2\t商品のサブ画像URL3\t商品のサブ画像URL4\t商品のサブ画像URL5\t商品のサブ画像URL6\t商品のサブ画像URL7\t商品のサブ画像URL8\tカラーサンプル画像URL\t親子関係の指定\tバリエーションテーマ\t親商品のSKU(商品管理番号)\t親子関係のタイプ\tアップデート・削除\tメーカー型番\t商品説明文\tお取り扱い上の注意\tお取り扱い上の注意\tお取り扱い上の注意\t対応言語\t型番\t版\t商品の仕様\t商品の仕様\t商品の仕様\t商品の仕様\t商品の仕様\t検索キーワード\tメーカー推奨最少年齢の単位\tメーカー推奨最高年齢の単位\t組み立て方法\t要組み立て\t組み立て時間の単位\t組み立て時間\t折りたたみ時のサイズ\t素材の種類\t機能性\t機能性\t機能性\t機能性\t機能性\tサイズ\tカラー\tカラーマップ\t商品の個数(ピース数)\tエンジンタイプ\t推奨使用用途\tコレクション名\tジャンル\t電池の説明\tリチウム電池エネルギー含有量\t出品者カタログ番号\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tプラチナキーワード\tスタイル名\tリチウム電池の電圧の測定単位\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tターゲットユーザーのキーワード\tshaft_style_type\tコントローラタイプ\tメーカー推奨最少年齢\tメーカー推奨最高年齢\tキャラクター\t素材構成\tスケール名\tレールの規格\t有線or無線\tサポート周波数帯域\t教育目標\t配送重量\t発送重量の単位\tメーカー推奨最低重量\tメーカー推奨最少体重の単位\tメーカー推奨最大重量\tメーカー推奨最大体重の単位\tメーカー推奨最小身長\t推奨最低身長の単位\tメーカー推奨最大身長\t推奨最高身長の単位\tサイズマップ\tハンドルの高さ\tハンドルの高さの単位\tシートの幅\t座面(椅子)の幅の単位\t商品の高さ\t商品の長さ\t商品の幅\t商品の重量(パッケージを含まない)\t商品の重量の単位\t商品の長さ\t商品の長さの単位\t商品の寸法の単位\tフルフィルメントセンターID\t商品パッケージの長さ\t商品パッケージの幅\t商品パッケージの高さ\t商品パッケージの重量\t商品パッケージの重量の単位\t商品パッケージの寸法の単位\t法規上の免責条項\t安全性の注意点\tメーカー保証の説明\t製造国/地域\t原産国/地域\t特徴・用途\t電池付属\tこの商品は電池本体ですか?または電池を使用した商品ですか?\t電池の種類、サイズ\t電池の種類、サイズ\t電池の種類、サイズ\t電池の数\t電池の数\t電池の数\t電池当たりのワット時\tリチウムイオン電池単数\tリチウムメタル電池単数\tリチウム含有量(グラム)\tリチウム電池パッケージ\t商品の重量\t商品の重量の単位\t電池の組成\t電池の重量(グラム)\t電池の重量の測定単位\tリチウム電池のエネルギー量測定単位\tリチウム電池の重量の測定単位\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t適用される危険物関連法令\t国連(UN)番号\t安全データシート(SDS) URL\t商品の体積\t商品の容量の単位\t引火点(°C)\t分類/危険物ラベル(適用されるものをすべて選択)\t分類/危険物ラベル(適用されるものをすべて選択)\t分類/危険物ラベル(適用されるものをすべて選択)\t出荷作業日数\tコンディション\t商品のコンディション説明\t商品の公開日\t予約商品の販売開始日\t商品の入荷予定日\t使用しない支払い方法\t配送日時指定SKUリスト\tセール価格\tセール開始日\tセール終了日\tパッケージ商品数\tメーカー希望価格\t付属品総数\tギフト包装\tギフトメッセージ\t最大注文個数\tメーカー製造中止\t終了日を提案する\t商品タックスコード\t配送パターン\t賞味期限管理商品\t販売形態(並行輸入品)\t開始日を提案する\tポイントパーセント\tセール時ポイントパーセント';

      // 英語フィールド名（3行目）
      const englishHeaders = 'feed_product_type\titem_sku\tbrand_name\titem_name\texternal_product_id\texternal_product_id_type\tmanufacturer\trecommended_browse_nodes\tis_adult_product\tquantity\tstandard_price\tmain_image_url\ttarget_gender\tother_image_url1\tother_image_url2\tother_image_url3\tother_image_url4\tother_image_url5\tother_image_url6\tother_image_url7\tother_image_url8\tswatch_image_url\tparent_child\tvariation_theme\tparent_sku\trelationship_type\tupdate_delete\tpart_number\tproduct_description\tcare_instructions1\tcare_instructions2\tcare_instructions3\tlanguage_value\tmodel\tedition\tbullet_point1\tbullet_point2\tbullet_point3\tbullet_point4\tbullet_point5\tgeneric_keywords\tmfg_minimum_unit_of_measure\tmfg_maximum_unit_of_measure\tassembly_instructions\tis_assembly_required\tassembly_time_unit_of_measure\tassembly_time\tfolded_size\tmaterial_type\tspecial_features1\tspecial_features2\tspecial_features3\tspecial_features4\tspecial_features5\tsize_name\tcolor_name\tcolor_map\tnumber_of_pieces\tengine_type\trecommended_uses_for_product\tcollection_name\tgenre\tbattery_description\tlithium_battery_voltage\tcatalog_number\tplatinum_keywords1\tplatinum_keywords2\tplatinum_keywords3\tplatinum_keywords4\tplatinum_keywords5\tstyle_name\tlithium_battery_voltage_unit_of_measure\ttarget_audience_keywords1\ttarget_audience_keywords2\ttarget_audience_keywords3\ttarget_audience_keywords4\ttarget_audience_keywords5\tshaft_style_type\tcontroller_type\tmfg_minimum\tmfg_maximum\tsubject_character\tmaterial_composition\tscale_name\trail_gauge\tremote_control_technology\tfrequency_bands_supported\teducational_objective\twebsite_shipping_weight\twebsite_shipping_weight_unit_of_measure\tminimum_weight_recommendation\tminimum_weight_recommendation_unit_of_measure\tmaximum_weight_recommendation\tmaximum_weight_recommendation_unit_of_measure\tminimum_height_recommendation\tminimum_height_recommendation_unit_of_measure\tmaximum_height_recommendation\tmaximum_height_recommendation_unit_of_measure\tsize_map\thandle_height\thandle_height_unit_of_measure\tseat_width\tseat_width_unit_of_measure\titem_height\titem_length\titem_width\titem_display_weight\titem_display_weight_unit_of_measure\titem_display_length\titem_display_length_unit_of_measure\titem_dimensions_unit_of_measure\tfulfillment_center_id\tpackage_length\tpackage_width\tpackage_height\tpackage_weight\tpackage_weight_unit_of_measure\tpackage_dimensions_unit_of_measure\tlegal_disclaimer_description\tsafety_warning\twarranty_description\tcountry_string\tcountry_of_origin\tspecific_uses_for_product\tare_batteries_included\tbatteries_required\tbattery_type1\tbattery_type2\tbattery_type3\tnumber_of_batteries1\tnumber_of_batteries2\tnumber_of_batteries3\tlithium_battery_energy_content\tnumber_of_lithium_ion_cells\tnumber_of_lithium_metal_cells\tlithium_battery_weight\tlithium_battery_packaging\titem_weight\titem_weight_unit_of_measure\tbattery_cell_composition\tbattery_weight\tbattery_weight_unit_of_measure\tlithium_battery_energy_content_unit_of_measure\tlithium_battery_weight_unit_of_measure\tsupplier_declared_dg_hz_regulation1\tsupplier_declared_dg_hz_regulation2\tsupplier_declared_dg_hz_regulation3\tsupplier_declared_dg_hz_regulation4\tsupplier_declared_dg_hz_regulation5\thazmat_united_nations_regulatory_id\tsafety_data_sheet_url\titem_volume\titem_volume_unit_of_measure\tflash_point\tghs_classification_class1\tghs_classification_class2\tghs_classification_class3\tfulfillment_latency\tcondition_type\tcondition_note\tproduct_site_launch_date\tmerchant_release_date\trestock_date\toptional_payment_type_exclusion\tdelivery_schedule_group_id\tsale_price\tsale_from_date\tsale_end_date\titem_package_quantity\tlist_price\tnumber_of_items\toffering_can_be_giftwrapped\toffering_can_be_gift_messaged\tmax_order_quantity\tis_discontinued_by_manufacturer\toffering_end_date\tproduct_tax_code\tmerchant_shipping_group_name\tis_expiration_dated_product\tdistribution_designation\toffering_start_date\tstandard_price_points_percent\tsale_price_points_percent';

      // フィルタ済み商品とNG出品者の商品、NGワード商品を除外してデータをAmazonフォーマットに変換
      const validProducts = filteredProducts.filter(product => {
        // 既存のフィルタチェック
        if (product.is_filtered) return false;
        if (product.seller_code && ngSellerCodes.has(product.seller_code)) return false;
        
        // NGワードチェック
        const ngCheck = checkForNGKeywords(product.title || '', product.description || '');
        if (ngCheck.isNG) {
          console.log(`CSV出力除外: 商品 "${product.title}" でNGワード検出: ${ngCheck.matchedKeywords.join(', ')}`);
          return false;
        }
        
        return true;
      });
      const csvData = validProducts.map(product => {
        // コンディションのマッピング
        const conditionMapping: Record<string, string> = {
          '新品、未使用': 'New',
          '未使用に近い': 'Used',
          '目立った傷や汚れなし': 'Used',
          'やや傷や汚れあり': 'Used',
          '傷や汚れあり': 'Used',
          '全体的に状態が悪い': 'Used'
        };
        
        const condition = conditionMapping[product.product_condition || ''] || 'Used';
        
        // Amazonフィールドにマッピングしたデータを作成
        const amazonData = new Array(192).fill(''); // 192はAmazonテンプレートのフィールド数
        
        // 必須フィールドを設定
        amazonData[0] = 'Hobbies'; // feed_product_type
        amazonData[1] = sanitizeText(product.id || ''); // item_sku
        amazonData[2] = 'ノーブランド品'; // brand_name
        amazonData[3] = sanitizeText(product.amazon_title || product.title || ''); // item_name
        amazonData[4] = ''; // external_product_id
        amazonData[5] = ''; // external_product_id_type
        amazonData[6] = 'ノーブランド品'; // manufacturer
        amazonData[7] = '3113755051'; // recommended_browse_nodes (Hobbies)
        amazonData[8] = 'FALSE'; // is_adult_product
        amazonData[9] = '1'; // quantity
        amazonData[10] = product.listing_price || product.price || 0; // standard_price
        amazonData[11] = product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : ''; // main_image_url
        amazonData[12] = ''; // target_gender
        // サブ画像 (13-20)
        if (product.images && Array.isArray(product.images)) {
          for (let i = 1; i < Math.min(product.images.length, 9); i++) {
            amazonData[12 + i] = product.images[i] || '';
          }
        }
        amazonData[21] = ''; // swatch_image_url
        amazonData[22] = ''; // parent_child
        amazonData[23] = ''; // variation_theme
        amazonData[24] = ''; // parent_sku
        amazonData[25] = ''; // relationship_type
        amazonData[26] = 'Update'; // update_delete
        amazonData[27] = sanitizeText(product.id || ''); // part_number
        amazonData[28] = sanitizeText(product.description || ''); // product_description
        // bullet_point1 (35)
        amazonData[35] = sanitizeText(product.amazon_title || product.title || '');
        amazonData[41] = 'Years'; // mfg_minimum_unit_of_measure
        amazonData[80] = '15'; // mfg_minimum
        amazonData[165] = '10'; // fulfillment_latency
        amazonData[166] = condition; // condition_type
        amazonData[167] = '全国送料無料。店舗でも販売しておりますので、在庫切れの場合はキャンセルさせていただく場合があります。セットものは別々に届く場合があります。お届けまでに1週間から10日ほどかかる場合がございますので、ご了承願います。'; // condition_note
        amazonData[191] = '0'; // sale_price_points_percent
        
        return amazonData;
      });

      // TSVコンテンツを作成(タブ区切り)
      const tsvContent = [
        templateMetadata,
        japaneseHeaders,
        englishHeaders,
        ...csvData.map(row => row.join('\t'))
      ].join('\n');

      // BOMなしでUTF-8で保存
      const blob = new Blob([tsvContent], { type: 'text/plain;charset=utf-8;' });

      // ファイルをダウンロード(.txt形式)
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const filename = `Amazon_インベントリファイル_${timestamp}.txt`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // CSV出力後、出力した商品のcsv_exportedフラグを更新（フィルタ済み商品は除外）
      const productIds = validProducts.map(p => p.id);
      const filteredCount = filteredProducts.length - validProducts.length;
      const { error } = await supabase
        .from(TABLE_NAMES.PRODUCTS)
        .update({ 
          csv_exported: true, 
          csv_exported_at: new Date().toISOString() 
        })
        .in('id', productIds);

      if (error) {
        console.error('TSV出力ステータス更新エラー:', error);
        alert('TSVファイルは出力されましたが、ステータスの更新に失敗しました');
      } else {
        // 成功した場合は商品リストを再読み込み
        await loadProducts();
        const ngSellerCount = filteredProducts.filter(p => 
          !p.is_filtered && p.seller_code && ngSellerCodes.has(p.seller_code)
        ).length;
        const ngKeywordCount = filteredProducts.filter(p => {
          if (p.is_filtered) return false;
          if (p.seller_code && ngSellerCodes.has(p.seller_code)) return false;
          const ngCheck = checkForNGKeywords(p.title || '', p.description || '');
          return ngCheck.isNG;
        }).length;
        const totalExcluded = filteredCount + ngSellerCount + ngKeywordCount;
        
        let message = `Amazonインベントリファイル(TSV)を出力しました: ${filename}\n\n有効商品: ${validProducts.length}件`;
        if (totalExcluded > 0) {
          message += `\n除外商品: ${totalExcluded}件`;
          if (filteredCount > 0) message += `\n  - フィルタ済み: ${filteredCount}件`;
          if (ngSellerCount > 0) message += `\n  - NG出品者: ${ngSellerCount}件`;
          if (ngKeywordCount > 0) message += `\n  - NGワード: ${ngKeywordCount}件`;
        }
        alert(message);
      }
    } catch (error) {
      console.error('TSV出力エラー:', error);
      alert('TSV出力に失敗しました');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">商品管理</h1>
        <p className="text-gray-600">フリマサイトから収集した商品データの表示・編集・Amazon出品準備</p>
      </div>

      {/* フィルターとアクション */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* 検索とフィルター */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="商品名・出品者で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-w-[160px]"
            >
              <option value="all">すべて</option>
              <option value="valid">有効商品</option>
              <option value="filtered">フィルタ済み</option>
              <option value="ng_sellers">NG出品者の商品</option>
              <option value="amazon_ready">Amazon準備完了</option>
              <option value="csv_exported">CSV反映済み</option>
              <option value="csv_not_exported">CSV未反映</option>
            </select>
          </div>
          
          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => markAsCSVExported(Array.from(selectedProducts))}
              disabled={selectedProducts.size === 0 || hasFilteredProducts}
              className="flex items-center justify-center px-6 py-4 bg-green-600 text-white text-base font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
              title={hasFilteredProducts ? "フィルタ済み商品、NG出品者、NGワード商品は反映できません" : ""}
            >
              <FileCheck className="w-5 h-5 mr-2" />
              CSV反映 ({selectedProducts.size})
              {hasFilteredProducts && <span className="ml-2 text-xs">⚠️</span>}
            </button>
            <button 
              onClick={bulkDeleteProducts}
              disabled={selectedProducts.size === 0}
              className="flex items-center justify-center px-6 py-4 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <X className="w-5 h-5 mr-2" />
              一括削除 ({selectedProducts.size})
            </button>
            <Link
              href="/csv-export"
              className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white text-base font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <FileOutput className="w-5 h-5 mr-2" />
              CSV管理
            </Link>
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
            >
              <Download className="w-5 h-5 mr-2" />
              Amazon TSV出力
            </button>
          </div>
        </div>
      </div>

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '検索条件に一致する商品がありません' : '商品がありません'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleAllSelection}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer hover:border-blue-400 transition-colors"
                      />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    onClick={toggleSortOrder}
                  >
                    <div className="flex items-center">
                      作成日時
                      <span className="ml-1">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">画像</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">仕入価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出品価格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">利益</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プラットフォーム</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayProducts.map((product) => {
                  const profit = (product.listing_price || 0) - (product.price || 0);
                  const profitRate = product.price ? ((profit / product.price) * 100) : 0;
                  const isEditing = editingId === product.id;
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {/* チェックボックス */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer hover:border-blue-400 transition-colors"
                          />
                        </div>
                      </td>
                      
                      {/* 作成日時 */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {formatDateTime(product.created_at).formatted}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {formatDateTime(product.created_at).relative}
                          </div>
                        </div>
                      </td>
                      
                      {/* 商品画像 */}
                      <td className="px-6 py-4">
                        <div className="flex-shrink-0 h-16 w-16">
                          {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
                            <img
                              className="h-16 w-16 rounded-lg object-cover border border-gray-200 shadow-sm"
                              src={product.images[0]}
                              alt={product.title || '商品画像'}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">画像なし</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* 商品名 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingProduct.title || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {product.title || '商品名なし'}
                          </div>
                        )}
                      </td>
                      
                      {/* 出品者 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingProduct.seller_name || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, seller_name: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="text-sm">
                            <div className="text-gray-900 font-medium">
                              {product.seller_name || '不明'}
                            </div>
                            {product.seller_code && (
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {product.seller_code}
                                {ngSellerCodes.has(product.seller_code) && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    NG出品者
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* 状態 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editingProduct.product_condition || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, product_condition: e.target.value})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">選択してください</option>
                            <option value="新品、未使用">新品、未使用</option>
                            <option value="未使用に近い">未使用に近い</option>
                            <option value="目立った傷や汚れなし">目立った傷や汚れなし</option>
                            <option value="やや傷や汚れあり">やや傷や汚れあり</option>
                            <option value="傷や汚れあり">傷や汚れあり</option>
                            <option value="全体的に状態が悪い">全体的に状態が悪い</option>
                          </select>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {product.product_condition || '不明'}
                          </div>
                        )}
                      </td>
                      
                      {/* 仕入価格 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingProduct.price || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">
                            {formatCurrency(product.price || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* 出品価格 */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingProduct.listing_price || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, listing_price: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        ) : (
                          <div className="text-sm text-green-600">
                            {formatCurrency(product.listing_price || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* 利益 */}
                      <td className="px-6 py-4">
                        <div className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <div>{formatCurrency(profit)}</div>
                          <div>({profitRate.toFixed(1)}%)</div>
                        </div>
                      </td>
                      
                      {/* ステータス */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editingProduct.amazon_status || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, amazon_status: e.target.value as 'draft' | 'ready' | 'uploaded' | 'active' | 'error'})}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="draft">下書き</option>
                            <option value="ready">出品準備完了</option>
                            <option value="uploaded">アップロード済み</option>
                            <option value="active">出品中</option>
                          </select>
                        ) : (
                          getStatusBadge(product)
                        )}
                      </td>
                      
                      {/* CSVステータス */}
                      <td className="px-6 py-4">
                        {product.csv_exported ? (
                          <div className="text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              反映済み
                            </span>
                            {product.csv_exported_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(product.csv_exported_at).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => markAsCSVExported([product.id])}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
                            title="CSVに反映"
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            反映
                          </button>
                        )}
                      </td>
                      
                      {/* プラットフォーム */}
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {product.platform?.platform_name || 'メルカリ'}
                      </td>
                      
                      {/* アクション */}
                      <td className="px-6 py-4">
                        <div className="flex space-x-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                title="保存"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                title="キャンセル"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                title="元のページを開く"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                              <button
                                onClick={() => startEdit(product)}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                title="編集"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4 mr-1 inline" />
                                削除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">表示中の商品統計</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredProducts.length}</div>
            <div className="text-sm text-gray-600">表示中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredProducts.filter(p => !p.is_filtered).length}
            </div>
            <div className="text-sm text-gray-600">有効商品</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {filteredProducts.filter(p => p.amazon_status === 'ready').length}
            </div>
            <div className="text-sm text-gray-600">Amazon準備完了</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(
                filteredProducts.reduce((sum, p) => sum + ((p.listing_price || 0) - (p.price || 0)), 0)
              )}
            </div>
            <div className="text-sm text-gray-600">合計予想利益</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">
              {filteredProducts.filter(p => p.csv_exported).length}
            </div>
            <div className="text-sm text-gray-600">CSV反映済み</div>
          </div>
        </div>
      </div>
    </div>
  );
}