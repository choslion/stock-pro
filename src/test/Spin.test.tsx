import { render, screen } from '@testing-library/react'
import Spin from '../components/ui/Spin'

describe('Spin', () => {
  it('로딩 텍스트를 렌더링한다', () => {
    render(<Spin />)
    expect(screen.getByText(/데이터를 불러오는 중/)).toBeInTheDocument()
  })

  it('스피너 SVG가 존재한다', () => {
    const { container } = render(<Spin />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
