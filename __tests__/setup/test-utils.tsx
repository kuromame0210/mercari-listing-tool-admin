import React, { ReactElement } from 'react'
import { render, RenderOptions, fireEvent } from '@testing-library/react'

// テスト用のプロバイダーコンポーネント
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

// カスタムレンダー関数
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

// テスト用のモックデータ生成関数
export const createMockProduct = (overrides = {}) => ({
  id: '1',
  platform_id: 'test-platform',
  url: 'https://example.com/product/1',
  title: 'テスト商品',
  seller_name: 'テスト出品者',
  price: 10000,
  listing_price: 12000,
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
  },
  ...overrides
})

// Supabaseモック関数
export const createSupabaseMock = (scenario: 'success' | 'error' | 'empty' = 'success') => {
  const mockData = scenario === 'empty' ? [] : [
    createMockProduct({ id: '1' }),
    createMockProduct({ 
      id: '2', 
      title: 'フィルタされた商品',
      is_filtered: true 
    })
  ]

  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => {
          if (scenario === 'error') {
            return Promise.resolve({ count: null, error: new Error('Database error') })
          }
          return Promise.resolve({ count: mockData.length, error: null })
        }),
        not: jest.fn(() => ({
          not: jest.fn(() => ({
            limit: jest.fn(() => {
              if (scenario === 'error') {
                return Promise.resolve({ data: null, error: new Error('Database error') })
              }
              return Promise.resolve({ 
                data: mockData.map(p => ({ 
                  price: p.price, 
                  listing_price: p.listing_price 
                })), 
                error: null 
              })
            })
          }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => {
            if (scenario === 'error') {
              return Promise.resolve({ data: null, error: new Error('Database error') })
            }
            return Promise.resolve({ data: mockData, error: null })
          })
        }))
      }))
    }))
  }
}

// 環境変数のモック設定
export const setupTestEnvironment = (mode: 'production' | 'demo' = 'production') => {
  if (mode === 'production') {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
}

// コンソールエラーの抑制
export const suppressConsoleError = () => {
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })
}

// 非同期操作の待機ヘルパー
export const waitForDataLoad = () => {
  return new Promise(resolve => setTimeout(resolve, 100))
}

// localStorage/sessionStorageのモック
export const mockStorage = () => {
  const storage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
  })
  
  Object.defineProperty(window, 'sessionStorage', {
    value: storage,
    writable: true,
  })
  
  return storage
}

// ファイルダウンロードのモック
export const mockFileDownload = () => {
  const mockURL = {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  }
  
  Object.defineProperty(window, 'URL', {
    value: mockURL,
    writable: true,
  })
  
  // HTMLAnchorElementのclickをモック
  const mockClick = jest.fn()
  Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
    value: mockClick,
    writable: true,
  })
  
  return { mockURL, mockClick }
}

// フォームイベントのシミュレーション
export const simulateFormSubmit = (form: HTMLFormElement, data: Record<string, string>) => {
  Object.keys(data).forEach(key => {
    const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement
    if (input) {
      fireEvent.change(input, { target: { value: data[key] } })
    }
  })
  
  fireEvent.submit(form)
}

// レスポンシブテスト用のビューポート変更
export const changeViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  window.dispatchEvent(new Event('resize'))
}

// テスト用の日付モック
export const mockDate = (isoString: string) => {
  const mockDate = new Date(isoString)
  jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime())
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
  
  return mockDate
}

// APIレスポンスのモック
export const mockApiResponse = (data: any, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      headers: new Headers(),
    })
  ) as jest.Mock
}

// ダミーテスト（test-utilsにテストが必要）
describe('Test Utils', () => {
  test('ダミーテスト', () => {
    expect(true).toBe(true)
  })
})

// 再エクスポート
export * from '@testing-library/react'
export { customRender as render }