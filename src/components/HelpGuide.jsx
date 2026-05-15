import { useState } from "react";
import Card from "./ui/Card";
import {
  BuildingLibraryIcon,
  GlobeIcon,
  ActivityIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  LightBulbIcon,
} from "./ui/Icons";

const SECTIONS = [
  {
    id: "kr",
    title: "국내 주식시장",
    icon: BuildingLibraryIcon,
    items: [
      {
        q: "코스피가 뭐야?",
        a: "삼성전자, SK하이닉스 같은 우리나라 대형 회사들이 주식을 사고파는 시장이야. 코스피 지수 숫자가 오르면 대기업들이 전반적으로 잘 되고 있다는 뜻이야. 우리나라 주식시장의 대표 성적표라고 보면 돼.",
      },
      {
        q: "코스닥은 코스피랑 뭐가 달라?",
        a: "코스닥은 바이오·IT·게임 같은 중소·스타트업 회사들이 모인 시장이야. 코스피보다 회사 규모는 작지만 성장 가능성이 크지. 대신 그만큼 주가가 더 크게 오르내릴 수 있어. 코스피가 대기업 리그라면 코스닥은 성장기업 리그야.",
      },
      {
        q: "업종이 뭐야?",
        a: "비슷한 사업을 하는 회사들을 묶은 그룹이야. 반도체 회사끼리, 자동차 회사끼리, 은행끼리 묶은 거지. 어떤 업종이 오르고 내리는지 보면 요즘 어떤 분야에 돈이 몰리고 있는지 알 수 있어.",
      },
    ],
  },
  {
    id: "us",
    title: "해외 주식시장",
    icon: GlobeIcon,
    items: [
      {
        q: "S&P 500이 뭐야?",
        a: "애플, 마이크로소프트, 구글 같은 미국 대기업 500개를 묶어서 만든 지수야. 전 세계 투자자들이 가장 많이 보는 지표 중 하나야. S&P 500이 오른다는 건 미국 경제가 잘 돌아가고 있다는 신호야.",
      },
      {
        q: "나스닥은?",
        a: "애플, 엔비디아, 메타 같은 기술·IT 회사들이 주로 모인 미국 시장이야. 코스닥처럼 성장 기업 위주라 S&P 500보다 변동이 더 클 수 있어. 기술주가 잘 나가는 날엔 나스닥이 더 많이 오르는 편이야.",
      },
      {
        q: "다우존스는?",
        a: "미국 대표 기업 딱 30개만 골라 만든 지수야. 범위는 좁지만 100년 넘는 역사를 가진 가장 오래된 지수야. 미국 경제의 큰 흐름을 파악할 때 참고해.",
      },
    ],
  },
  {
    id: "indicators",
    title: "시장 심리 지표",
    icon: ActivityIcon,
    items: [
      {
        q: "공포·탐욕 지수(FGI)가 뭐야?",
        a: "투자자들이 지금 겁먹고 있는지, 욕심 부리고 있는지를 0~100 숫자로 나타낸 거야. 0에 가까울수록 다들 무서워서 팔고 있고(공포), 100에 가까울수록 신나서 사고 있다는 뜻(탐욕)이야. \"남들이 겁먹을 때 사고, 탐욕 부릴 때 팔아라\"는 투자 격언에서 많이 써.",
      },
      {
        q: "VIX(변동성 지수)가 뭐야?",
        a: "앞으로 주가가 얼마나 크게 흔들릴 것 같은지를 나타내는 숫자야. '공포 지수'라고도 불러. 보통 15 이하면 시장이 안정적이고, 30이 넘으면 투자자들이 많이 불안해하는 상태야. VIX가 높다고 꼭 나쁜 건 아니야 — 그때가 오히려 저가 매수 기회일 수 있어.",
      },
      {
        q: "종합 타이밍 점수는 어떻게 만들어?",
        a: "이 앱에서 VIX와 FGI를 합쳐서 만든 지표야. 점수가 낮을수록(공포 구간) 매수 기회일 가능성이 높고, 높을수록(탐욕 구간) 시장이 과열돼 조심해야 한다는 신호야. 절대적인 기준은 아니고 참고용으로 활용해.",
      },
      {
        q: "국내 시장 심리 점수는?",
        a: "KOSPI의 실현 변동성, 20일 이동평균 대비 위치, 상승 업종 비율을 합쳐서 만든 국내판 심리 지수야. 숫자가 낮으면 국내 시장이 침체돼 있다는 뜻이고, 높으면 과열 신호야.",
      },
    ],
  },
  {
    id: "macro",
    title: "매크로 경제",
    icon: CurrencyDollarIcon,
    items: [
      {
        q: "환율이 주식이랑 무슨 관계야?",
        a: "달러 환율이 오른다 = 원화 가치가 떨어진다는 뜻이야. 삼성전자처럼 달러로 물건을 파는 수출 기업은 환율이 오르면 이익이 늘어나. 반대로 원유나 원자재를 달러로 수입하는 회사들은 비용이 올라가서 부담이 커지지.",
      },
      {
        q: "금·원유 같은 원자재는 왜 봐?",
        a: "원유가 비싸지면 물류비·생산비가 올라서 많은 기업 실적에 영향이 생겨. 금은 경제가 불안할 때 사람들이 몰리는 '안전자산'이야. 금값이 많이 오른다는 건 세계 경제가 불안정하다는 신호로 읽기도 해.",
      },
      {
        q: "ETF가 뭐야?",
        a: "여러 주식을 한 바구니에 담아서 주식처럼 거래할 수 있는 상품이야. 예를 들어 반도체 ETF 하나를 사면 삼성전자·SK하이닉스·DB하이텍 등 여러 반도체 회사에 한꺼번에 투자하는 효과가 나. 하나만 골라야 하는 부담 없이 위험을 분산할 수 있어서 처음 투자할 때 좋아.",
      },
      {
        q: "섹터 ETF는?",
        a: "미국 주식시장을 정보기술·금융·헬스케어·에너지 등 11개 분야로 나눠서 만든 ETF야. XLK(기술), XLF(금융)처럼 영문 2~4글자 약어로 불러. 어떤 섹터 ETF가 오르고 내리는지 보면 지금 미국에서 어떤 산업에 돈이 몰리는지 바로 알 수 있어.",
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
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
          <p className="px-1 pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
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
        <p className="text-sm text-blue-300">궁금한 용어를 눌러서 확인해봐</p>
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
