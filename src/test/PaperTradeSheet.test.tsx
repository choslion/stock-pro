import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axiosInstance from '../lib/axiosInstance'
import PaperTradeSheet from '../components/PaperTradeSheet'
import { usePortfolioStore } from '../store/usePortfolioStore'
import type { PaperTrade } from '../lib/portfolio'
import { renderWithQuery } from './helpers'

vi.mock('../lib/axiosInstance', () => ({
  default: { get: vi.fn() },
}))

const mockGet = vi.mocked(axiosInstance.get)

const STOCK = { ticker: '005930', name: '삼성전자', market: 'KR' as const, price: 80000, change_rate: 1.5 }

function heldTrade(overrides: Partial<PaperTrade> = {}): PaperTrade {
  return {
    id: 'held', ticker: '005930', name: '삼성전자', market: 'KR', side: 'buy',
    quantity: 10, unitPriceKrw: 80_000, unitPriceOriginal: 80_000, exchangeRate: 1,
    totalKrw: 800_000, createdAt: '2026-07-01T00:00:00.000Z', ...overrides,
  }
}

beforeEach(() => {
  usePortfolioStore.setState({ trades: [] })
  mockGet.mockReset()
  mockGet.mockResolvedValue({
    data: { items: [{ ticker: '005930', price: 80000, change_rate: 1.5 }], usd_krw: 1400 },
  })
})

async function renderSheet(props: Partial<React.ComponentProps<typeof PaperTradeSheet>> = {}) {
  const onClose = props.onClose ?? vi.fn()
  renderWithQuery(<PaperTradeSheet stock={STOCK} {...props} onClose={onClose} />)
  await waitFor(() => expect(screen.getByRole('tab', { name: '매수' })).toBeInTheDocument())
  return onClose
}

describe('PaperTradeSheet 접근성', () => {
  it('다이얼로그 시맨틱을 갖는다', async () => {
    await renderSheet()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'paper-trade-title')
  })

  it('마지막 요소에서 Tab을 누르면 초점이 시트 안에서 순환한다', async () => {
    await renderSheet()
    screen.getByRole('button', { name: '가상 매수하기' }).focus()
    await userEvent.tab()
    expect(screen.getByLabelText('닫기')).toHaveFocus()
  })

  it('첫 요소에서 Shift+Tab을 누르면 마지막 요소로 순환한다', async () => {
    await renderSheet()
    screen.getByLabelText('닫기').focus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: '가상 매수하기' })).toHaveFocus()
  })

  it('ESC로 닫을 수 있다', async () => {
    const onClose = await renderSheet()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('금액 초과 시 입력이 aria-invalid로 표시된다', async () => {
    await renderSheet()
    const input = screen.getByLabelText('투자 금액')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    await userEvent.clear(input)
    await userEvent.type(input, '99999999999')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('사용 가능한 현금을 초과했습니다.')).toBeInTheDocument()
  })
})

describe('PaperTradeSheet 매수', () => {
  it('금액만 넣으면 바로 매수할 수 있다', async () => {
    await renderSheet()
    expect(screen.getByRole('button', { name: '가상 매수하기' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: '가상 매수하기' }))
    const trades = usePortfolioStore.getState().trades
    expect(trades).toHaveLength(1)
    expect(trades[0].side).toBe('buy')
    expect(trades[0].quantity).toBe(12)      // 1,000,000 / 80,000 내림
  })
})

describe('PaperTradeSheet 주 단위 거래', () => {
  const US_STOCK = { ticker: 'ZETA', name: 'Zeta Global Holdings Corp.', market: 'US' as const, price: 30, change_rate: 1 }

  it('미국 주식도 소수점 없이 정수로만 매수된다', async () => {
    mockGet.mockResolvedValue({
      data: { items: [{ ticker: 'ZETA', price_krw: 42_229, price_usd: 30, change_rate: 1 }], usd_krw: 1_400 },
    })
    const onClose = vi.fn()
    renderWithQuery(<PaperTradeSheet stock={US_STOCK} onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText('투자 금액')).toBeInTheDocument())
    // 1,000,000 / 42,229 = 23.68... -> 23주
    expect(screen.getByText('예상 23주 · 971,267원')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '가상 매수하기' }))
    expect(usePortfolioStore.getState().trades[0].quantity).toBe(23)
  })

  it('구버전 소수점 보유분도 전량 매도로 남김없이 팔린다', async () => {
    usePortfolioStore.setState({
      trades: [heldTrade({ quantity: 25.6932, unitPriceKrw: 42_229, totalKrw: 1_084_863 })],
    })
    await renderSheet({ initialSide: 'sell' })
    await userEvent.click(screen.getByRole('button', { name: '전량' }))
    await userEvent.click(screen.getByRole('button', { name: '가상 매도하기' }))
    const sold = usePortfolioStore.getState().trades[0]
    expect(sold.side).toBe('sell')
    expect(sold.quantity).toBe(25.6932)   // 25주로 잘려 0.6932주가 남으면 안 된다
  })

  it('소수점 보유분을 일부만 팔면 주 단위로 내린다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade({ quantity: 25.6932 })] })
    await renderSheet({ initialSide: 'sell' })
    await userEvent.type(screen.getByLabelText('매도 수량'), '10.9')
    expect(screen.getByText(/^10주 · 예상 회수/)).toBeInTheDocument()
  })
})

describe('PaperTradeSheet 매도', () => {
  it('보유 수량이 없으면 매도 탭을 누를 수 없다', async () => {
    await renderSheet()
    expect(screen.getByRole('tab', { name: '매도' })).toBeDisabled()
  })

  it('보유 중이면 매도 탭으로 전환되고 보유 수량이 보인다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade()] })
    await renderSheet()
    await userEvent.click(screen.getByRole('tab', { name: '매도' }))
    expect(screen.getByLabelText('매도 수량')).toBeInTheDocument()
    expect(screen.getByText('10주')).toBeInTheDocument()
  })

  it('initialSide로 매도 화면을 바로 열 수 있다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade()] })
    await renderSheet({ initialSide: 'sell' })
    expect(screen.getByLabelText('매도 수량')).toBeInTheDocument()
  })

  it('국내 주식은 50%를 눌러도 소수점 주가 나오지 않는다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade({ quantity: 3, totalKrw: 240_000 })] })
    await renderSheet({ initialSide: 'sell' })
    await userEvent.click(screen.getByRole('button', { name: '50%' }))
    expect(screen.getByLabelText('매도 수량')).toHaveValue('1')   // 1.5가 아니라 1
  })

  it('전량 버튼을 누르면 보유 수량이 채워지고 매도가 기록된다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade()] })
    await renderSheet({ initialSide: 'sell' })
    await userEvent.click(screen.getByRole('button', { name: '전량' }))
    expect(screen.getByLabelText('매도 수량')).toHaveValue('10')
    await userEvent.click(screen.getByRole('button', { name: '가상 매도하기' }))
    const trades = usePortfolioStore.getState().trades
    expect(trades[0].side).toBe('sell')
    expect(trades[0].quantity).toBe(10)
    expect(trades[0].totalKrw).toBe(800_000)
  })

  it('보유 수량을 넘겨 입력하면 aria-invalid로 표시된다', async () => {
    usePortfolioStore.setState({ trades: [heldTrade()] })
    await renderSheet({ initialSide: 'sell' })
    const input = screen.getByLabelText('매도 수량')
    await userEvent.type(input, '50')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('보유 수량을 초과했습니다.')).toBeInTheDocument()
  })
})
