# Stock Pro

국내·미국 시장 데이터와 종목 정보를 한곳에서 살펴보고, AI 브리핑과 질문 기능으로 시장 흐름을 쉽게 이해할 수 있도록 만든 투자 지표 대시보드입니다.

- 프론트엔드·FastAPI 백엔드 단독 개발
- 2025.07 ~ 현재 고도화 중
- [Live Demo](https://stock-pro-seven.vercel.app/)

## 핵심 기능

- **시장 데이터 통합** — 국내·미국 지수, VIX·공포탐욕지수, 섹터, ETF, 환율·원자재와 증시 뉴스를 탭별로 조회합니다.
- **종목 탐색과 관심종목** — 국내외 종목 검색, 가격 차트, 거래 순위를 제공하며 개인 관심종목은 브라우저에 최대 30개까지 저장합니다.
- **모의 포트폴리오와 투자 일기** — 가상 자금 1,000만 원으로 종목을 매수하고 이유·목표 기간·기대 시나리오를 기록합니다. 동일한 매수 날짜·금액·잔여 현금을 적용한 KOSPI·S&P 500 포트폴리오와 성과를 비교하고, Claude 주간 복기를 갱신하거나 지난 기록을 돌아볼 수 있습니다.
- **AI 데이터 해석** — 현재 시장 데이터를 바탕으로 초보자용 시황 브리핑, 스트리밍 질의응답과 종목 차트 코멘트를 제공합니다.
- **투자 시뮬레이션** — "만약 그때 샀더라면" 화면에서 과거 매수 시점(1·3·5·10년 전)과 금액을 정해 현재 평가액·손익·수익률을 계산하고 평가액 추이를 보여줍니다. 미국 종목은 당시와 현재 환율을 함께 반영합니다.
- **기기별 탐색과 접근성** — PC 사이드바와 모바일 하단 탭을 구분하고, 공통 탭의 ARIA 상태·키보드 이동과 검색 모달의 포커스 관리를 구현했습니다.

## 기술적으로 해결한 문제

### 외부 시세 API의 응답 지연

- 원자재·환율·미국 섹터·미국 지수 API의 종목별 순차 요청을 `yf.download` 일괄 요청으로 변경해, **개발 환경의 캐시 미스 기준 응답 시간을 5~8배 단축**했습니다.
- 백엔드에 1분 fresh·30분 hard TTL의 SWR(stale-while-revalidate) 캐시를 구성했습니다. 만료 데이터가 남아 있으면 먼저 반환한 뒤 백그라운드에서 갱신하고, 같은 키의 중복 갱신은 잠금으로 방지합니다.
- KRX 시세표·환율·ETF 목록처럼 여러 엔드포인트와 필터가 함께 쓰는 원본 데이터는 가공 전 단계에서 공유 캐시로 묶어, 필터가 달라도 시장별 1회만 수집하도록 정리했습니다.
- 45초 주기 캐시 워머로 주요 시장 데이터를 미리 준비하며, API 키가 설정된 환경에서는 AI 브리핑도 함께 준비합니다. 프론트엔드도 첫 화면 렌더 이후 비활성 탭 데이터를 사전 요청합니다.

### AI 응답의 형식과 문체 편차

- Claude API 응답을 `headline`, `tone`, `points` JSON 구조로 제한하고, 파싱 실패 시 평문을 표시하는 폴백을 구성했습니다.
- 금융 용어와 수치 나열을 줄이는 문장 규칙을 프롬프트에 정의해 초보자도 읽기 쉬운 브리핑을 생성합니다.
- 질의응답은 SSE 스트리밍으로 전달하며 입력·대화 이력 검증과 요청 제한을 적용했습니다.

### 여러 화면에서 반복되는 상태와 동작

- Query Key와 요청 함수를 중앙화하고 TanStack Query의 캐시·자동 갱신·사전 요청 조건을 공통으로 관리합니다.
- 카드·로딩·오류·빈 상태·탭을 공통 UI로 분리하고, 탭에는 방향키·Home·End 이동과 선택 상태를 적용했습니다.
- 검색·탭 전환·공통 UI와 투자 시뮬레이션·포트폴리오 계산 로직을 **8개 테스트 파일, 47개 테스트 케이스**로 검증하며 GitHub Actions에서 타입 검사·테스트·빌드를 실행합니다.

## 구조

```text
React · TypeScript (Vercel)
        │ REST / SSE
        ▼
FastAPI (Render)
        ├─ yfinance · pykrx · FinanceDataReader
        ├─ 시장 심리 지표 · 뉴스 RSS
        └─ Claude API
```

프론트엔드는 화면 단위로 지연 로드하고, FastAPI가 외부 시장 데이터를 수집·정규화·캐싱해 제공합니다. AI 기능은 같은 시장 데이터 스냅샷을 입력으로 사용합니다.

## 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Data & State | TanStack Query, Zustand, Axios |
| Visualization & Motion | Recharts, Lightweight Charts, Framer Motion |
| Backend | FastAPI, Python, yfinance, pykrx, FinanceDataReader |
| AI | Claude API, SSE |
| Test & CI | Vitest, Testing Library, GitHub Actions |
| Deploy | Vercel, Render |

## 로컬 실행

Node.js 20과 Python 3.12 환경을 권장합니다.

```bash
git clone https://github.com/choslion/stock-pro.git
cd stock-pro
npm install

python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

프로젝트 루트에 `.env`를 만듭니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8000
ANTHROPIC_API_KEY=your_api_key
```

`ANTHROPIC_API_KEY`가 없어도 시장 데이터 화면은 실행할 수 있지만 AI 기능은 사용할 수 없습니다.

백엔드와 프론트엔드를 각각 실행합니다.

```bash
# terminal 1
npm run server

# terminal 2
npm run dev
```

## 검증

```bash
npx tsc --noEmit
npm run test:run
npm run build
```

`main` 브랜치의 push와 pull request에서는 GitHub Actions가 위 타입 검사·테스트·빌드를 순서대로 실행합니다.

## 데이터 및 이용 안내

- 시세와 뉴스는 외부 데이터 제공 상태와 캐시 갱신 시점에 따라 지연되거나 일부 누락될 수 있습니다.
- AI 브리핑과 답변은 시장 데이터의 이해를 돕기 위한 참고 정보이며 투자 권유나 수익을 보장하는 정보가 아닙니다.
- Render 인스턴스가 정지된 뒤 첫 요청에는 콜드 스타트로 시간이 걸릴 수 있습니다.
