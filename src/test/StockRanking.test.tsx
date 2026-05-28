import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axiosInstance from '../lib/axiosInstance'
import StockRanking from '../components/StockRanking'
import { renderWithQuery } from './helpers'

vi.mock('../lib/axiosInstance', () => ({
  default: { get: vi.fn() },
}))

const mockGet = vi.mocked(axiosInstance.get)

const DOMESTIC = {
  data: {
    items: [
      { rank: 1, ticker: '005930', name: '삼성전자',  price: 80000,  change_rate:  1.5 },
      { rank: 2, ticker: '000660', name: 'SK하이닉스', price: 200000, change_rate: -0.5 },
    ],
  },
}

const OVERSEAS = {
  data: {
    stocks: [
      { rank: 1, ticker: 'AAPL', name: 'Apple Inc.', price_usd: 200, price_krw: 280000, change_rate: 0.8 },
    ],
    usd_krw: 1400,
  },
}

beforeEach(() => {
  mockGet.mockReset()
  mockGet.mockResolvedValue(DOMESTIC)
})

describe('StockRanking', () => {
  it('로딩 중에는 스피너를 보여준다', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<StockRanking />)
    expect(screen.getByText(/데이터를 불러오는 중/)).toBeInTheDocument()
  })

  it('국내 주식 목록을 표시한다', async () => {
    renderWithQuery(<StockRanking />)
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    expect(screen.getByText('SK하이닉스')).toBeInTheDocument()
  })

  it('등락률 양수는 빨간색, 음수는 파란색으로 표시된다', async () => {
    renderWithQuery(<StockRanking />)
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())

    expect(screen.getByText('+1.50%')).toHaveClass('text-red-400')
    expect(screen.getByText('-0.50%')).toHaveClass('text-blue-400')
  })

  it('해외 탭으로 전환하면 해외 데이터를 표시한다', async () => {
    mockGet
      .mockResolvedValueOnce(DOMESTIC)
      .mockResolvedValueOnce(OVERSEAS)

    renderWithQuery(<StockRanking />)
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '해외' }))
    await waitFor(() => expect(screen.getByText('Apple Inc.')).toBeInTheDocument())
  })

  it('해외 탭에서 원화/달러 토글이 표시된다', async () => {
    mockGet
      .mockResolvedValueOnce(DOMESTIC)
      .mockResolvedValueOnce(OVERSEAS)

    renderWithQuery(<StockRanking />)
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: '해외' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '원' })).toBeInTheDocument()
  })
})
