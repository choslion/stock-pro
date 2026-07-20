import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axiosInstance from '../lib/axiosInstance'
import PaperTradeSheet from '../components/PaperTradeSheet'
import { renderWithQuery } from './helpers'

vi.mock('../lib/axiosInstance', () => ({
  default: { get: vi.fn() },
}))

const mockGet = vi.mocked(axiosInstance.get)

const STOCK = { ticker: '005930', name: '삼성전자', market: 'KR' as const, price: 80000, change_rate: 1.5 }

beforeEach(() => {
  mockGet.mockReset()
  mockGet.mockResolvedValue({
    data: { items: [{ ticker: '005930', price: 80000, change_rate: 1.5 }], usd_krw: 1400 },
  })
})

async function renderSheet(onClose = vi.fn()) {
  renderWithQuery(<PaperTradeSheet stock={STOCK} onClose={onClose} />)
  await waitFor(() => expect(screen.getByLabelText('투자 금액')).toBeInTheDocument())
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
    screen.getByLabelText('기대 시나리오').focus()
    await userEvent.tab()
    expect(screen.getByLabelText('닫기')).toHaveFocus()
  })

  it('첫 요소에서 Shift+Tab을 누르면 마지막 요소로 순환한다', async () => {
    await renderSheet()
    screen.getByLabelText('닫기').focus()
    await userEvent.tab({ shift: true })
    expect(screen.getByLabelText('기대 시나리오')).toHaveFocus()
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

  it('기대 시나리오가 5자 미만이면 오류가 textarea와 연결된다', async () => {
    await renderSheet()
    const textarea = screen.getByLabelText('기대 시나리오')
    await userEvent.type(textarea, '메모')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    expect(textarea).toHaveAttribute('aria-describedby', 'paper-thesis-error')
    expect(screen.getByText('5자 이상 적어주세요.')).toBeInTheDocument()
  })
})
