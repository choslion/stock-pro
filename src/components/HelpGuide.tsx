import React, { useState } from "react";
import Card from "./ui/Card";
import {
  ChartBarIcon,
  TrendingUpIcon,
  BookmarkIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BoltIcon,
} from "./ui/Icons";

interface FaqItem {
  q: string;
  a: string;
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
    ],
  },
  {
    id: "watchlist",
    title: "관심 탭",
    icon: BookmarkIcon,
    items: [
      {
        q: "관심 종목은 어떻게 추가해요?",
        a: "현재는 코드 내 설정 파일(watchlist 설정)로 관리해요.\n\n상단 돋보기로 종목을 검색하면 현재가와 등락률을 바로 확인할 수 있어요.",
      },
      {
        q: "관심 탭에서 뭘 볼 수 있어요?",
        a: "등록된 국내·해외 종목의 현재가, 전일 대비 등락률, 시가총액을 한눈에 볼 수 있어요.\n\n국내는 원화, 해외는 달러·원화 모두 표시돼요.",
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
      },
    ],
  },
];

function AccordionItem({ q, a }: FaqItem) {
  const [open, setOpen] = useState(false);
  const paragraphs = a.split("\n\n");

  return (
    <div className="border-b border-gray-700/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-4 px-1 text-left hover:bg-gray-700/20 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-100">{q}</span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-2 pt-1 pb-5 space-y-3 border-l-2 border-gray-700/60 ml-1">
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
                <AccordionItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
