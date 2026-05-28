import { render, screen } from '@testing-library/react'
import Card from '../components/ui/Card'

function MockIcon({ className }: { className?: string }) {
  return <svg data-testid="icon" className={className} />
}

describe('Card', () => {
  it('children을 렌더링한다', () => {
    render(<Card>내용</Card>)
    expect(screen.getByText('내용')).toBeInTheDocument()
  })

  it('title이 있으면 표시된다', () => {
    render(<Card title="테스트 카드">내용</Card>)
    expect(screen.getByText('테스트 카드')).toBeInTheDocument()
  })

  it('subtitle이 있으면 표시된다', () => {
    render(<Card title="제목" subtitle="부제목">내용</Card>)
    expect(screen.getByText('부제목')).toBeInTheDocument()
  })

  it('icon이 있으면 렌더링된다', () => {
    render(<Card title="제목" icon={MockIcon}>내용</Card>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('title이 없으면 헤더 영역이 없다', () => {
    render(<Card>내용만</Card>)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
