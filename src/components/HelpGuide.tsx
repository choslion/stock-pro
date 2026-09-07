import React, { useState } from "react";
import Card from "./ui/Card";
import {
  ChartBarIcon,
  TrendingUpIcon,
  NewspaperIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BoltIcon,
} from "./ui/Icons";

interface FaqItem {
  q:       string;
  a:       string;
  caution?: boolean;
}

interface Section {
  id:    string;
  title: string;
  icon:  React.ComponentType<{ className?: string }>;
  items: FaqItem[];
}

const SECTIONS: Section[] = [
  {
    id: "market",
    title: "시장 탭",
    icon: ChartBarIcon,
    items: [
      {
        q: "시장 탭에서 뭘 볼 수 있어요?",
        a: "국내·해외·테마 세 가지 화면으로 나뉘어요.\n\n국내: 코스피 지수, 국내 시장 심리 점수, KOSPI 업종별 등락률\n해외: 미국 주요 지수(S&P 500·나스닥·다우), 공포·탐욕 지수, 섹터 ETF 동향\n테마: AI·반도체·전기차 등 테마별 국내외 주요 종목 현황",
      },
      {
        q: "AI 브리핑은 뭐예요?",
        a: "매일 아침 AI가 오늘의 시장 상황을 짧게 요약해줘요.\n\n전날 주요 지수 흐름, 눈에 띄는 섹터, 오늘 주의할 포인트를 담아요. 하루 한 번 자동으로 갱신돼요.",
      },
      {
        q: "업종별 동향은 최대 몇 개까지 나와요?",
        a: "국내·해외 각각 최대 20개까지 표시해요.\n\n국내는 KOSPI 업종 분류 기준, 해외는 S&P 500 섹터 ETF 기준으로 등락률 순으로 나열돼요.",
      },
    ],
  },
  {
    id: "chart",
    title: "차트 탭",
    icon: TrendingUpIcon,
    items: [
      {
        q: "차트 탭에는 어떤 정보가 있어요?",
        a: "투자자 동향: 기관·외국인·개인의 매수·매도 흐름\n원자재: 금·은·원유·천연가스 실시간 가격\n환율: 원/달러, 엔/달러 등 주요 환율\n거래량 랭킹: 오늘 가장 많이 거래된 종목\nETF 인기 순위: 많이 거래된 ETF 목록",
      },
      {
        q: "AI 차트 코멘트는 뭐예요?",
        a: "종목 차트를 보면서 AI에게 분석을 요청할 수 있어요.\n\n최근 가격 흐름, 고점·저점, 등락률을 바탕으로 AI가 간단한 코멘트를 달아줘요. 투자 추천이 아닌 참고용이에요.",
      },
      {
        q: "'만약 그때 샀더라면'은 어떻게 사용해요?",
        a: "차트 탭 상단의 '만약 그때 샀더라면'을 누른 뒤 종목, 투자 금액, 날짜를 선택하세요.\n\n미국 종목은 당시와 현재의 원·달러 환율을 함께 반영해요. 투자금 전액을 해당 종목에 넣은 것으로 계산하며, 배당·세금·수수료는 포함하지 않은 참고용 결과예요.",
      },
    ],
  },
  {
    id: "news",
    title: "뉴스 탭",
    icon: NewspaperIcon,
    items: [
      {
        q: "뉴스는 어디서 가져와요?",
        a: "연합뉴스·머니투데이·Yahoo Finance의 증시 관련 기사를 모아서 보여줘요.\n\n30분마다 갱신되고, 최신 기사부터 나열돼요. 제목을 누르면 원문 기사로 이동해요.",
      },
      {
        q: "국내/해외 필터는 뭐예요?",
        a: "전체·국내·해외 버튼으로 원하는 시장의 뉴스만 골라 볼 수 있어요.\n\n국내는 연합뉴스·머니투데이, 해외는 Yahoo Finance 기사예요.",
      },
    ],
  },
  {
    id: "portfolio",
    title: "모의투자 탭",
    icon: CurrencyDollarIcon,
    items: [
      {
        q: "가상 매수는 어떻게 시작해요?",
        a: "종목 검색이나 차트 상세에서 '가상 매수'를 누르세요.\n\n투자 금액만 넣으면 현재가 기준으로 수량이 계산되고, 가상 자금 1,000만 원에서 그만큼 차감돼요. 실제 주문은 발생하지 않아요.",
      },
      {
        q: "산 종목은 어떻게 파나요?",
        a: "보유 종목 목록에서 '매도'를 누르고 수량을 넣으면 돼요. 25%·50%·전량 버튼으로 빠르게 채울 수도 있어요.\n\n팔면 그만큼 가상 현금이 돌아오고, 평단과의 차이가 실현 손익으로 쌓여요.",
      },
      {
        q: "모의투자 탭에서 뭘 볼 수 있어요?",
        a: "총 가상 자산과 실현 손익, 보유 종목 수익률, KOSPI·S&P 500 대비 성과를 확인할 수 있어요.\n\n관심종목과 지금까지의 거래 내역도 한 화면에서 볼 수 있어요.",
      },
      {
        q: "관심종목은 어디로 갔나요?",
        a: "관심종목은 모의투자 화면 안에 그대로 있어요. 상단 돋보기로 종목을 검색한 뒤 ★를 누르면 추가됩니다.\n\n관심종목과 모의투자 기록은 현재 브라우저에만 저장돼요.",
      },
      {
        q: "여기 수익률이 실제 투자 성과인가요?",
        a: "아니요. 실제 주문이나 수수료·세금 없이 현재가만으로 계산한 가상 결과예요. 투자 판단의 근거로 쓰기에는 적합하지 않아요.",
        caution: true,
      },
    ],
  },
  {
    id: "ai",
    title: "AI 탭",
    icon: SparklesIcon,
    items: [
      {
        q: "AI 탭에서 어떤 걸 물어볼 수 있어요?",
        a: "주식·시장·경제 관련 질문을 자유롭게 할 수 있어요.\n\n예) 오늘 코스피 왜 빠졌어? / 달러 강세가 삼성전자에 미치는 영향은? / 나스닥 최근 흐름 어때?\n\n실시간 시장 데이터를 바탕으로 답해줘요.",
      },
      {
        q: "AI 답변을 믿어도 되나요?",
        a: "AI 답변은 참고용이에요. 투자 결정은 반드시 본인 판단으로 하세요.\n\n실시간 데이터를 활용하지만 오류가 있을 수 있고, 미래 수익을 보장하지 않아요.",
        caution: true,
      },
      {
        q: "질문 글자 수 제한이 있나요?",
        a: "한 번에 최대 50글자까지 입력할 수 있어요.\n\n과도한 사용을 막기 위해 1분에 5회, 하루 전체 100회 한도가 있어요.",
      },
    ],
  },
  {
    id: "search",
    title: "종목 검색",
    icon: MagnifyingGlassIcon,
    items: [
      {
        q: "종목은 어떻게 검색해요?",
        a: "상단 돋보기 아이콘을 누르면 검색창이 열려요.\n\n한글 이름(삼성전자, 엔비디아)이나 영문 티커(NVDA, 005930)로 검색할 수 있어요.",
      },
      {
        q: "한글로 검색해도 찾을 수 있나요?",
        a: "네, 대부분의 주요 종목은 한글로 검색 가능해요.\n\n정확한 이름이 아니어도 비슷한 이름(퍼지 매칭)으로 찾아줘요. 예) '아이렌' → IREN 자동 매칭",
      },
      {
        q: "검색 결과에 가격이 안 나와요",
        a: "장이 닫혀 있거나 해당 종목의 실시간 데이터를 가져오지 못한 경우예요.\n\n종목 자체는 검색되지만 가격 정보가 없을 수 있어요. 장중에 다시 시도해보세요.",
      },
    ],
  },
  {
    id: "data",
    title: "데이터 안내",
    icon: BoltIcon,
    items: [
      {
        q: "데이터는 얼마나 자주 업데이트돼요?",
        a: "대부분의 데이터는 페이지를 열 때 가져와요.\n\n시장 지수, 환율, 원자재는 수분 단위로 갱신되며, 장 마감 후에는 종가 기준으로 표시돼요.",
      },
      {
        q: "데이터 출처는 어디예요?",
        a: "국내 주식: Yahoo Finance (KRX 기준)\n해외 주식·ETF: Yahoo Finance\n환율·원자재: Yahoo Finance\n공포·탐욕 지수: CNN Fear & Greed Index\nAI 분석: Anthropic Claude",
      },
      {
        q: "이 앱은 투자 추천을 하나요?",
        a: "아니요. stock-pro는 시장 데이터를 편리하게 보여주는 정보 서비스예요.\n\nAI 코멘트와 점수 지표는 모두 참고용이며, 실제 투자 결정은 본인 책임으로 하셔야 해요.",
        caution: true,
      },
    ],
  },
];

function AccordionItem({ q, a, caution }: FaqItem) {
  const [open, setOpen] = useState(false);
  const paragraphs = a.split("\n\n");

  return (
    <div className="border-b border-gray-700/25 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-4 px-1 text-left hover:bg-gray-700/20 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-100">
          {caution && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
              주의
            </span>
          )}
          {q}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="mx-1 mb-3 px-3 py-3 rounded-xl bg-gray-800/40 space-y-3">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-sm text-gray-400 leading-loose whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpGuide() {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.id} title={section.title} icon={Icon}>
            <div className="-mb-1">
              {section.items.map((item) => (
                <AccordionItem key={item.q} q={item.q} a={item.a} caution={item.caution} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
