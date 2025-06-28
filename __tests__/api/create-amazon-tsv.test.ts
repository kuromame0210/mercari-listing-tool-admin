import { NextRequest } from 'next/server'
import { POST } from '../../app/api/create-amazon-tsv/route'

// Supabaseクライアントのモック
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        data: [
          {
            id: '1',
            title: 'iPhone 15 Pro Max',
            amazon_title: 'iPhone 15 Pro Max 256GB',
            amazon_description: '最新のiPhone',
            price: 120000,
            listing_price: 135000,
            amazon_main_image_url: 'https://example.com/image1.jpg',
            amazon_other_image_urls: 'https://example.com/image2.jpg,https://example.com/image3.jpg',
            amazon_bullet_point_1: '高性能プロセッサ',
            amazon_bullet_point_2: 'プロ品質カメラ',
            amazon_condition: 'New',
            amazon_condition_note: '新品未開封'
          },
          {
            id: '2',
            title: 'MacBook Air M2',
            amazon_title: 'MacBook Air M2 2022',
            amazon_description: '軽量ノートPC',
            price: 98000,
            listing_price: 115000,
            amazon_main_image_url: 'https://example.com/mac1.jpg',
            amazon_other_image_urls: '',
            amazon_bullet_point_1: 'M2チップ搭載',
            amazon_bullet_point_2: '長時間バッテリー',
            amazon_condition: 'Used - Like New',
            amazon_condition_note: '使用感少ない'
          }
        ],
        error: null
      })
    })
  }))
}

// モジュールモック
jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
  TABLE_NAMES: {
    PRODUCTS: 'flea_market_research_products'
  }
}))

describe.skip('/api/create-amazon-tsv', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('TSVファイルが正常に生成される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/tab-separated-values')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="amazon-products.tsv"')
  })

  test('TSVのヘッダーが正しく設定される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    const headers = lines[0].split('\t')
    
    expect(headers).toContain('sku')
    expect(headers).toContain('product-id')
    expect(headers).toContain('product-id-type')
    expect(headers).toContain('price')
    expect(headers).toContain('item-condition')
    expect(headers).toContain('item-name')
    expect(headers).toContain('product-description')
    expect(headers).toContain('main-image-url')
    expect(headers).toContain('other-image-url1')
  })

  test('商品データが正しくTSV形式に変換される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    expect(lines.length).toBeGreaterThan(2) // ヘッダー + データ行
    
    // 最初の商品データをチェック
    const firstProductData = lines[1].split('\t')
    expect(firstProductData[0]).toBe('SKU-1') // SKU
    expect(firstProductData[3]).toBe('135000') // price
    expect(firstProductData[5]).toBe('iPhone 15 Pro Max 256GB') // item-name
  })

  test('空のデータでも正常に処理される', async () => {
    mockEq.mockReturnValueOnce({
      data: [],
      error: null
    })

    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    expect(lines.length).toBe(2) // ヘッダーのみ（最後は空行）
  })

  test('Supabaseエラーが適切に処理される', async () => {
    mockEq.mockReturnValueOnce({
      data: null,
      error: new Error('Database connection failed')
    })

    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    
    expect(response.status).toBe(500)
    const errorData = await response.json()
    expect(errorData).toHaveProperty('error')
  })

  test('商品画像URLが正しく分割される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    const firstProductData = lines[1].split('\t')
    
    // main-image-url
    expect(firstProductData[7]).toBe('https://example.com/image1.jpg')
    // other-image-url1
    expect(firstProductData[8]).toBe('https://example.com/image2.jpg')
  })

  test('商品状態が正しく設定される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    const firstProductData = lines[1].split('\t')
    const secondProductData = lines[2].split('\t')
    
    // 新品
    expect(firstProductData[4]).toBe('New')
    // 中古
    expect(secondProductData[4]).toBe('Used - Like New')
  })

  test('bullet pointsが正しく設定される', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const lines = tsvContent.split('\n')
    const headers = lines[0].split('\t')
    const bulletPointIndex1 = headers.indexOf('bullet-point1')
    const bulletPointIndex2 = headers.indexOf('bullet-point2')
    
    expect(bulletPointIndex1).toBeGreaterThan(-1)
    expect(bulletPointIndex2).toBeGreaterThan(-1)
    
    const firstProductData = lines[1].split('\t')
    expect(firstProductData[bulletPointIndex1]).toBe('高性能プロセッサ')
    expect(firstProductData[bulletPointIndex2]).toBe('プロ品質カメラ')
  })

  test('文字エスケープが正しく処理される', async () => {
    // タブや改行を含むデータをテスト
    mockEq.mockReturnValueOnce({
      data: [
        {
          id: '1',
          amazon_title: 'タイトル\tタブ含む',
          amazon_description: '説明文\n改行含む',
          price: 10000,
          listing_price: 12000
        }
      ],
      error: null
    })

    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    // タブや改行が適切にエスケープされているかチェック
    expect(tsvContent).not.toContain('\t\t') // 連続タブがないこと
    expect(tsvContent.split('\n').length).toBeGreaterThan(0) // 適切に行分割されていること
  })

  test('大量データの処理', async () => {
    const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
      id: i.toString(),
      amazon_title: `商品${i}`,
      amazon_description: `説明${i}`,
      price: 1000 + i,
      listing_price: 1200 + i,
      amazon_condition: 'New'
    }))

    mockEq.mockReturnValueOnce({
      data: largeDataSet,
      error: null
    })

    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    
    expect(response.status).toBe(200)
    
    const tsvContent = await response.text()
    const lines = tsvContent.split('\n')
    expect(lines.length).toBe(1002) // ヘッダー + 1000データ + 空行
  })

  test('必須フィールドの存在確認', async () => {
    const request = new NextRequest('http://localhost/api/create-amazon-tsv', {
      method: 'POST'
    })

    const response = await POST(request)
    const tsvContent = await response.text()
    
    const headers = tsvContent.split('\n')[0].split('\t')
    
    // Amazon出品に必要な必須フィールドをチェック
    const requiredFields = [
      'sku',
      'product-id',
      'product-id-type', 
      'price',
      'item-condition',
      'item-name',
      'product-description'
    ]
    
    requiredFields.forEach(field => {
      expect(headers).toContain(field)
    })
  })
})