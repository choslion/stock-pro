import { render, screen } from '@testing-library/react'
import SummaryBanner from '../components/ui/SummaryBanner'

describe('SummaryBanner', () => {
  it('텍스트를 렌더링한다', () => {
    render(<SummaryBanner text="시장 안정" />)
    expect(screen.getByText('시장 안정')).toBeInTheDocument()
  })

  it('type 미지정 시 neutral 스타일이 적용된다', () => {
    const { container } = render(<SummaryBanner text="테스트" />)
    expect(container.firstChild).toHaveClass('text-gray-300')
  })

  it('type=safe 시 green 스타일이 적용된다', () => {
    const { container } = render(<SummaryBanner text="안전" type="safe" />)
    expect(container.firstChild).toHaveClass('text-green-300')
  })

  it('type=danger 시 red 스타일이 적용된다', () => {
    const { container } = render(<SummaryBanner text="위험" type="danger" />)
    expect(container.firstChild).toHaveClass('text-red-300')
  })
})
