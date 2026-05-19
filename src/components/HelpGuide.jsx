import { useState } from "react";
import Card from "./ui/Card";
import {
  BuildingLibraryIcon,
  GlobeIcon,
  ActivityIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  LightBulbIcon,
  ClockFaceIcon,
} from "./ui/Icons";

const SECTIONS = [
  {
    id: "kr",
    title: "국내 주식시장",
    icon: BuildingLibraryIcon,
    items: [
      {
        q: "코스피가 뭐예요?",
        a: "삼성전자, SK하이닉스 같은 우리나라 대형 회사들이 주식을 사고파는 시장이에요.\n\n코스피 지수 숫자가 오르면 대기업들이 전반적으로 잘 되고 있다는 뜻이에요. 우리나라 주식시장의 대표 성적표라고 보면 돼요.",
      },
      {
        q: "코스닥은 코스피랑 뭐가 달라요?",
        a: "코스닥은 바이오·IT·게임 같은 중소·스타트업 회사들이 모인 시장이에요.\n\n코스피보다 회사 규모는 작지만 성장 가능성이 크죠. 대신 그만큼 주가가 더 크게 오르내릴 수 있어요.\n\n코스피가 대기업 리그라면 코스닥은 성장기업 리그예요.",
      },
      {
        q: "업종이 뭐예요?",
        a: "비슷한 사업을 하는 회사들을 묶은 그룹이에요. 반도체 회사끼리, 자동차 회사끼리, 은행끼리 묶은 거예요.\n\n어떤 업종이 오르고 내리는지 보면 요즘 어떤 분야에 돈이 몰리고 있는지 알 수 있어요.",
      },
    ],
  },
  {
    id: "us",
    title: "해외 주식시장",
    icon: GlobeIcon,
    items: [
      {
        q: "S&P 500이 뭐예요?",
        a: "애플, 마이크로소프트, 구글 같은 미국 대기업 500개를 묶어서 만든 지수예요.\n\n전 세계 투자자들이 가장 많이 보는 지표 중 하나예요. S&P 500이 오른다는 건 미국 경제가 잘 돌아가고 있다는 신호예요.",
      },
      {
        q: "나스닥은요?",
        a: "애플, 엔비디아, 메타 같은 기술·IT 회사들이 주로 모인 미국 시장이에요.\n\n코스닥처럼 성장 기업 위주라 S&P 500보다 변동이 더 클 수 있어요. 기술주가 잘 나가는 날엔 나스닥이 더 많이 오르는 편이에요.",
      },
      {
        q: "다우존스는요?",
        a: "미국 대표 기업 딱 30개만 골라 만든 지수예요.\n\n범위는 좁지만 100년 넘는 역사를 가진 가장 오래된 지수예요. 미국 경제의 큰 흐름을 파악할 때 참고해요.",
      },
    ],
  },
  {
    id: "hours",
    title: "장 시간 & 세션",
    icon: ClockFaceIcon,
    items: [
      {
        q: "한국 주식시장은 몇 시에 열려요?",
        a: "평일 오전 9:00 ~ 오후 3:30이에요. 토·일·공휴일은 쉬어요.\n\n그 전후로 동시호가 시간이 있어요. 장 시작 전(8:30~9:00)과 장 마감 후(15:30~16:00)에 주문을 모아서 한꺼번에 체결해요.",
      },
      {
        q: "미국 주식시장은 한국 기준으로 몇 시예요?",
        a: "미국 동부시간(ET) 기준 오전 9:30 ~ 오후 4:00예요.\n\n한국 시간으로 환산하면 -\n서머타임(3~11월): 밤 10:30 ~ 새벽 5:00\n겨울(11~3월): 밤 11:30 ~ 새벽 6:00\n\n그래서 미국장은 주로 밤에 봐야 해요.",
      },
      {
        q: "데이마켓 vs 나이트마켓이 뭔가요?",
        a: "데이마켓은 정규 거래 시간을 말하는 거예요.\n\n나이트마켓은 정규장 외 시간에 거래되는 시장인데, 보통 미국 선물이나 암호화폐처럼 24시간 가까이 거래되는 상품에서 많이 써요. 한국 코스피 선물도 야간 거래(18:00~05:00)가 있어요.",
      },
      {
        q: "프리마켓·애프터마켓은 또 뭐예요?",
        a: "미국 주식의 정규장 전후에도 거래할 수 있는 시간외 시장이에요.\n\n프리마켓(Pre-market): 정규장 열리기 전 - 미국 ET 4:00~9:30 / 한국 기준 오후 5시~밤 11시 반\n\n애프터마켓(After-hours): 정규장 닫힌 후 - 미국 ET 4:00~8:00pm / 한국 기준 새벽 5시~9시\n\n거래량이 적어서 변동성이 크고, 실적 발표 같은 뉴스가 나오면 이 시간에 주가가 크게 움직이기도 해요.",
      },
      {
        q: "시간외에 사면 뭐가 달라요?",
        a: "정규장이랑 몇 가지 차이가 있어요.\n\n① 거래량이 훨씬 적어요\n살 사람·팔 사람이 적다 보니 내가 원하는 가격에 바로 안 체결될 수 있어요. 급하게 팔려고 해도 안 팔릴 수 있어요.\n\n② 호가 스프레드가 넓어요\n사는 가격과 파는 가격 차이가 커서 조금 손해 보고 거래하게 될 수 있어요.\n\n③ 변동성이 더 커요\n참여자가 적으니까 뉴스 하나에 주가가 훨씬 크게 튀어요. 실적 발표가 시간외에 나오면 ±10% 이상도 흔해요.\n\n④ 시가랑 다를 수 있어요\n프리마켓에서 올랐다고 정규장 열릴 때도 그 가격으로 시작하는 게 아니에요. 정규장 열리면 다시 사람들이 몰려서 가격이 조정되기도 해요.\n\n처음엔 정규장 시간에만 거래하는 게 훨씬 안전해요.",
      },
    ],
  },
  {
    id: "indicators",
    title: "시장 심리 지표",
    icon: ActivityIcon,
    items: [
      {
        q: "공포·탐욕 지수(FGI)가 뭐예요?",
        a: "투자자들이 지금 겁먹고 있는지, 욕심 부리고 있는지를 0~100 숫자로 나타낸 거예요.\n\n0에 가까울수록 다들 무서워서 팔고 있고(공포), 100에 가까울수록 신나서 사고 있다는 뜻(탐욕)이에요.\n\n\"남들이 겁먹을 때 사고, 탐욕 부릴 때 팔아라\"는 투자 격언에서 많이 써요.",
      },
      {
        q: "VIX(변동성 지수)가 뭐예요?",
        a: "앞으로 주가가 얼마나 크게 흔들릴 것 같은지를 나타내는 숫자예요. '공포 지수'라고도 불러요.\n\n보통 15 이하면 시장이 안정적이고, 30이 넘으면 투자자들이 많이 불안해하는 상태예요.\n\nVIX가 높다고 꼭 나쁜 건 아니에요 — 그때가 오히려 저가 매수 기회일 수 있어요.",
      },
      {
        q: "종합 타이밍 점수는 어떻게 만들어요?",
        a: "FGI, RSI(14일), MA200, HYG 크레딧 스프레드 네 가지 지표를 조합해서 만든 거예요.\n\n점수가 낮을수록(공포 구간) 매수 기회일 가능성이 높고, 높을수록(탐욕 구간) 시장이 과열돼 조심해야 한다는 신호예요.\n\n절대적인 기준은 아니고 참고용으로 활용해요.",
      },
      {
        q: "국내 시장 심리 점수는요?",
        a: "KOSPI의 실현 변동성, 20일 이동평균 대비 위치, 상승 업종 비율을 합쳐서 만든 국내판 심리 지수예요.\n\n숫자가 낮으면 국내 시장이 침체돼 있다는 뜻이고, 높으면 과열 신호예요.",
      },
    ],
  },
  {
    id: "macro",
    title: "매크로 경제",
    icon: CurrencyDollarIcon,
    items: [
      {
        q: "환율이 주식이랑 무슨 관계예요?",
        a: "달러 환율이 오른다 = 원화 가치가 떨어진다는 뜻이에요.\n\n삼성전자처럼 달러로 물건을 파는 수출 기업은 환율이 오르면 이익이 늘어나요. 반대로 원유나 원자재를 달러로 수입하는 회사들은 비용이 올라가서 부담이 커지죠.",
      },
      {
        q: "금·원유 같은 원자재는 왜 봐요?",
        a: "원유가 비싸지면 물류비·생산비가 올라서 많은 기업 실적에 영향이 생겨요.\n\n금은 경제가 불안할 때 사람들이 몰리는 '안전자산'이에요. 금값이 많이 오른다는 건 세계 경제가 불안정하다는 신호로 읽기도 해요.",
      },
      {
        q: "ETF가 뭐예요?",
        a: "여러 주식을 한 바구니에 담아서 주식처럼 거래할 수 있는 상품이에요.\n\n예를 들어 반도체 ETF 하나를 사면 삼성전자·SK하이닉스·DB하이텍 등 여러 반도체 회사에 한꺼번에 투자하는 효과가 나요.\n\n하나만 골라야 하는 부담 없이 위험을 분산할 수 있어서 처음 투자할 때 좋아요.",
      },
      {
        q: "섹터 ETF는요?",
        a: "미국 주식시장을 정보기술·금융·헬스케어·에너지 등 11개 분야로 나눠서 만든 ETF예요.\n\nXLK(기술), XLF(금융)처럼 영문 2~4글자 약어로 불러요.\n\n어떤 섹터 ETF가 오르고 내리는지 보면 지금 미국에서 어떤 산업에 돈이 몰리는지 바로 알 수 있어요.",
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  const paragraphs = a.split("\n\n");

  return (
    <div className="border-b border-gray-700/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-3 px-1 text-left hover:bg-gray-700/20 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">{q}</span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-1 pb-4 space-y-2">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
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
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <LightBulbIcon className="w-4 h-4 shrink-0 text-blue-400" />
        <p className="text-sm text-blue-300">궁금한 용어를 눌러서 확인해봐요</p>
      </div>
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
