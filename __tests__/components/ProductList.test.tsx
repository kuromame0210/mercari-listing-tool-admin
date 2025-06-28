import { render, screen, fireEvent } from '@testing-library/react'
import ProductList from '../../components/ProductList'
import { Product } from '../../lib/supabase'

// モックデータ
const mockProducts: Product[] = [
  {
    id: '1',
    platform_id: 'test-platform',
    url: 'https://example.com/product/1',
    title: 'iPhone 15 Pro',
    seller_name: 'tech_seller',
    price: 120000,
    listing_price: 135000,
    is_filtered: false,
    images: ['https://example.com/image1.jpg'],
    checkout_status: '購入手続きへ',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    platform: {
      id: 'test-platform',
      platform_name: 'メルカリ',
      platform_code: 'mercari',
      base_url: 'https://mercari.com',
      is_active: true,
      platform_fee_rate: 0.1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: '2',
    platform_id: 'test-platform',
    url: 'https://example.com/product/2',
    title: 'MacBook Air M2',
    seller_name: 'pc_seller',
    price: 98000,
    listing_price: 115000,
    is_filtered: true,
    images: [],
    checkout_status: '売り切れました',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    platform: {
      id: 'test-platform',
      platform_name: 'メルカリ',
      platform_code: 'mercari',
      base_url: 'https://mercari.com',
      is_active: true,
      platform_fee_rate: 0.1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
]

describe('ProductList Component', () => {
  test('商品がない場合のメッセージが表示される', () => {
    render(<ProductList products={[]} />)
    
    expect(screen.getByText('商品がありません')).toBeInTheDocument()
  })

  test('商品リストが正しく表示される', () => {
    render(<ProductList products={mockProducts} />)
    
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument()
    expect(screen.getByText('MacBook Air M2')).toBeInTheDocument()
  })

  test('商品情報が正しく表示される', () => {
    render(<ProductList products={[mockProducts[0]]} />)
    
    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument()
    expect(screen.getByText('出品者: tech_seller')).toBeInTheDocument()
    expect(screen.getByText('仕入れ:')).toBeInTheDocument()
    expect(screen.getByText('￥120,000')).toBeInTheDocument()
    expect(screen.getByText('出品予定: ￥135,000')).toBeInTheDocument()
  })

  test('利益計算が正しく表示される', () => {
    render(<ProductList products={[mockProducts[0]]} />)
    
    // 利益: 135,000 - 120,000 = 15,000
    expect(screen.getByText('利益: ￥15,000 (12.5%)')).toBeInTheDocument()
  })

  test('フィルタ済み商品のスタイルが適用される', () => {
    render(<ProductList products={[mockProducts[1]]} />)
    
    // フィルタ済み商品のコンテナを特定（より具体的なセレクタを使用）
    const filteredProductContainer = screen.getByText('MacBook Air M2').closest('.border.rounded-lg')
    expect(filteredProductContainer).toHaveClass('bg-red-50', 'border-red-200')
  })

  test('有効商品のバッジが表示される', () => {
    render(<ProductList products={[mockProducts[0]]} />)
    
    expect(screen.getByText('有効')).toBeInTheDocument()
  })

  test('フィルタ済みバッジが表示される', () => {
    render(<ProductList products={[mockProducts[1]]} />)
    
    expect(screen.getByText('フィルタ済み')).toBeInTheDocument()
  })

  test('売り切れバッジが表示される', () => {
    render(<ProductList products={[mockProducts[1]]} />)
    
    expect(screen.getByText('売り切れ')).toBeInTheDocument()
  })

  test('商品画像が表示される', () => {
    render(<ProductList products={[mockProducts[0]]} />)
    
    const image = screen.getByAltText('iPhone 15 Pro')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg')
  })

  test('画像がない場合のプレースホルダーが表示される', () => {
    render(<ProductList products={[mockProducts[1]]} />)
    
    expect(screen.getByText('No Image')).toBeInTheDocument()
  })

  test('外部リンクが正しく設定される', () => {
    render(<ProductList products={[mockProducts[0]]} />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/product/1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('compactモードで小さく表示される', () => {
    render(<ProductList products={[mockProducts[0]]} compact={true} />)
    
    const title = screen.getByText('iPhone 15 Pro')
    expect(title).toHaveClass('text-sm')
  })

  test('負の利益が赤色で表示される', () => {
    const negativeProduct: Product = {
      ...mockProducts[0],
      price: 150000,
      listing_price: 140000
    }
    
    render(<ProductList products={[negativeProduct]} />)
    
    const profitElement = screen.getByText(/利益: -￥10,000/)
    expect(profitElement).toHaveClass('text-red-600')
  })

  test('複数商品が正しい順序で表示される', () => {
    render(<ProductList products={mockProducts} />)
    
    const titles = screen.getAllByRole('heading', { level: 3 })
    expect(titles[0]).toHaveTextContent('iPhone 15 Pro')
    expect(titles[1]).toHaveTextContent('MacBook Air M2')
  })

  test('商品名がない場合のフォールバック', () => {
    const productWithoutTitle: Product = {
      ...mockProducts[0],
      title: ''
    }
    
    render(<ProductList products={[productWithoutTitle]} />)
    
    expect(screen.getByText('商品名なし')).toBeInTheDocument()
  })

  test('出品者名がない場合のフォールバック', () => {
    const productWithoutSeller: Product = {
      ...mockProducts[0],
      seller_name: ''
    }
    
    render(<ProductList products={[productWithoutSeller]} />)
    
    expect(screen.getByText('出品者: 不明')).toBeInTheDocument()
  })

  test('価格がnullの場合の処理', () => {
    const productWithNullPrice: Product = {
      ...mockProducts[0],
      price: null,
      listing_price: null
    }
    
    render(<ProductList products={[productWithNullPrice]} />)
    
    expect(screen.getByText('仕入れ:')).toBeInTheDocument()
    expect(screen.getByText('￥0')).toBeInTheDocument()
  })
})