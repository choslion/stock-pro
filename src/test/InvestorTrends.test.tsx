import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axiosInstance from '../lib/axiosInstance'
import InvestorTrends from '../components/InvestorTrends'
import { renderWithQuery } from './helpers'

vi.mock('../lib/axiosInstance', () => ({
  default: { get: vi.fn() },
}))

const mockGet = vi.mocked(axiosInstance.get)

const row = (rank: number, ticker: string, name: string, netAmount: number) => ({
  rank,
  ticker,
  name,
  price: 80000,
  change_rate: 1.25,
  net_amount: netAmount,
})

const RESPONSE = {
  data: {
    market: 'KOSPI',
    as_of: '2026-09-07',
    source: 'Npay 증권',
    fetched_at: '2026-09-07T09:30:00Z',
    investors: {
      foreign: {
        net_buy: [row(1, '005930', '삼성전자', 120_000_000_000)],
        net_sell: [row(1, '000660', 'SK하이닉스', -90_000_000_000)],
      },
      institution: {
        net_buy: [row(1, '035420', 'NAVER', 70_000_000_000)],
        net_sell: [row(1, '051910', 'LG화학', -60_000_000_000)],
      },
      individual: {
        net_buy: [row(1, '005380', '현대차', 50_000_000_000)],
        net_sell: [row(1, '068270', '셀트리온', -40_000_000_000)],
      },
    },
  },
}

beforeEach(() => {
  mockGet.mockReset()
  mockGet.mockResolvedValue(RESPONSE)
})

describe('InvestorTrends', () => {
  it('기본으로 외국인 순매수 순위를 표시한다', async () => {
    renderWithQuery(<InvestorTrends />)

    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())
    expect(screen.getByText('외국인 순매수 상위')).toBeInTheDocument()
    expect(screen.getByText('1,200억원')).toHaveClass('text-red-400')
    expect(screen.getByText('2026.09.07 기준')).toBeInTheDocument()
  })

  it('투자자와 순매도 필터를 즉시 전환한다', async () => {
    renderWithQuery(<InvestorTrends />)
    await waitFor(() => expect(screen.getByText('삼성전자')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('tab', { name: '개인' }))
    expect(screen.getByText('현대차')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '순매도' }))
    expect(screen.getByText('개인 순매도 상위')).toBeInTheDocument()
    expect(screen.getByText('셀트리온')).toBeInTheDocument()
    expect(screen.getByText('400억원')).toHaveClass('text-blue-400')
  })
})
