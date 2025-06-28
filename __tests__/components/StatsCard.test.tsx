import { render, screen } from '@testing-library/react'
import { Package } from 'lucide-react'
import StatsCard from '../../components/StatsCard'

describe('StatsCard Component', () => {
  const defaultProps = {
    title: 'テスト統計',
    value: '1,234',
    icon: Package,
    color: 'bg-blue-500'
  }

  test('正しくレンダリングされる', () => {
    render(<StatsCard {...defaultProps} />)
    
    expect(screen.getByText('テスト統計')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  test('タイトルが表示される', () => {
    render(<StatsCard {...defaultProps} title="商品数" />)
    
    expect(screen.getByText('商品数')).toBeInTheDocument()
  })

  test('値が表示される', () => {
    render(<StatsCard {...defaultProps} value="999" />)
    
    expect(screen.getByText('999')).toBeInTheDocument()
  })

  test('アイコンが表示される', () => {
    render(<StatsCard {...defaultProps} />)
    
    // Lucide ReactのPackageアイコンがSVGとしてレンダリングされることを確認
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  test('背景色クラスが適用される', () => {
    render(<StatsCard {...defaultProps} color="bg-green-500" />)
    
    const iconContainer = document.querySelector('.bg-green-500')
    expect(iconContainer).toBeInTheDocument()
  })

  test('大きな数値が正しく表示される', () => {
    render(<StatsCard {...defaultProps} value="1,000,000" />)
    
    expect(screen.getByText('1,000,000')).toBeInTheDocument()
  })

  test('長いタイトルが表示される', () => {
    const longTitle = 'とても長い統計項目のタイトルです'
    render(<StatsCard {...defaultProps} title={longTitle} />)
    
    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  test('空の値でも正しく動作する', () => {
    render(<StatsCard {...defaultProps} value="" />)
    
    expect(screen.getByText('テスト統計')).toBeInTheDocument()
  })

  test('異なる色の組み合わせで正しく動作する', () => {
    const colors = ['bg-red-500', 'bg-yellow-500', 'bg-purple-500']
    
    colors.forEach(color => {
      const { container } = render(<StatsCard {...defaultProps} color={color} />)
      const iconContainer = container.querySelector(`.${color}`)
      expect(iconContainer).toBeInTheDocument()
    })
  })

  test('スナップショット', () => {
    const { container } = render(<StatsCard {...defaultProps} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})