import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axiosInstance from '../lib/axiosInstance'
import SearchModal from '../components/SearchModal'
import { renderWithQuery } from './helpers'

// lightweight-charts는 jsdom에서 동작 안 함 — StockChartModal용 mock
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn() })),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    remove: vi.fn(),
  })),
  LineSeries: {},
}))

vi.mock('../lib/axiosInstance', () => ({
  default: { get: vi.fn() },
}))

const mockGet = vi.mocked(axiosInstance.get)

beforeEach(() => { mockGet.mockReset() })

describe('SearchModal', () => {
  it('초기 상태에서 안내 문구를 표시한다', () => {
    renderWithQuery(<SearchModal onClose={vi.fn()} />)
    expect(screen.getByText('2글자 이상 입력하면 검색합니다')).toBeInTheDocument()
  })

  it('2글자 이상 입력하면 검색 API를 호출하고 결과를 표시한다', async () => {
    mockGet.mockResolvedValue({
      data: {
        items: [
          { ticker: '005930', name: '삼성전자', market: 'KR', price: 80000, change_rate: 1.5 },
        ],
      },
    })

    renderWithQuery(<SearchModal onClose={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), '삼성')

    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    expect(screen.getByText('005930')).toBeInTheDocument()
  })

  it('검색 결과가 없으면 "검색 결과가 없습니다"를 표시한다', async () => {
    mockGet.mockResolvedValue({ data: { items: [] } })

    renderWithQuery(<SearchModal onClose={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), '없는종목')

    await waitFor(() => expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument())
  })

  it('ESC 키를 누르면 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    renderWithQuery(<SearchModal onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('결과 클릭 시 차트 모달이 열린다', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          items: [
            { ticker: 'AAPL', name: 'Apple Inc.', market: 'US', price: 200, change_rate: 0.8 },
          ],
        },
      })
      // 차트 모달에서 /chart 엔드포인트 호출
      .mockResolvedValue({ data: { items: [] } })

    renderWithQuery(<SearchModal onClose={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'AAPL')
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Apple Inc.'))
    expect(screen.getByLabelText('검색으로 돌아가기')).toBeInTheDocument()
  })
})
