import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { MarketEvent } from "../types/api";
import Card from "./ui/Card";
import { ClockIcon } from "./ui/Icons";

const HISTORY_STALE_MS = 6 * 60 * 60_000;

function formatOccurredAt(value: string) {
  const date = new Date(value);
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replace(/ /g, "").replace(/\.$/, "");
  const timeText = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return { dateText, timeText };
}

function EventItem({ kind, event }: { kind: "sidecar" | "circuit_breaker"; event: MarketEvent | null }) {
  const isSidecar = kind === "sidecar";
  const label = isSidecar ? "사이드카" : "서킷브레이커";

  if (!event) {
    return (
      <div className="min-w-0 rounded-xl border border-gray-700 bg-gray-900/40 p-4">
        <p className="text-xs font-bold text-gray-300">{label}</p>
        <p className="mt-4 text-sm text-gray-500">조회 기간 내 발동 기록 없음</p>
      </div>
    );
  }

  const { dateText, timeText } = formatOccurredAt(event.occurred_at);
  const direction = event.direction === "buy" ? "매수" : event.direction === "sell" ? "매도" : null;
  const detail = isSidecar
    ? `${event.market} · ${direction ? `${direction} 프로그램 호가 정지` : "프로그램 호가 정지"}`
    : `${event.market}${event.phase ? ` · ${event.phase}단계` : ""} · 전체 매매 중단`;

  return (
    <div className="min-w-0 rounded-xl border border-gray-700 bg-gray-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${
          isSidecar ? "bg-amber-400/10 text-amber-300" : "bg-red-400/10 text-red-300"
        }`}>
          {label}
        </span>
        <span className="text-[11px] text-gray-500">최근 발동</span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
        <time className="text-base font-bold text-white" dateTime={event.occurred_at}>{dateText}</time>
        <span className="text-sm font-semibold text-gray-300">{timeText}</span>
      </div>
      <p className="mt-1.5 break-keep text-xs leading-5 text-gray-400">{detail}</p>
    </div>
  );
}

const CARD_PROPS = {
  title: "최근 시장 안전장치",
  subtitle: "사이드카 · 서킷브레이커 마지막 발동 일시",
  icon: ClockIcon,
};

export default function MarketEventHistory() {
  const { data, isLoading } = useQuery({
    queryKey: Q.marketEventHistory(),
    queryFn: fetchers.marketEventHistory,
    staleTime: HISTORY_STALE_MS,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card {...CARD_PROPS}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="최근 시장 안전장치 불러오는 중">
          {[0, 1].map((item) => (
            <div key={item} className="h-[118px] animate-pulse rounded-xl bg-gray-700/40" />
          ))}
        </div>
      </Card>
    );
  }

  // 배포 환경에서는 KIND 조회가 막혀 있어 실패가 일상적이다.
  // 주요 화면에 실패 문구를 계속 띄우기보다 카드를 숨긴다.
  if (!data?.available) return null;

  return (
    <Card {...CARD_PROPS}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EventItem kind="sidecar" event={data.latest_events.sidecar} />
        <EventItem kind="circuit_breaker" event={data.latest_events.circuit_breaker} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span>한국거래소 시장운영공지 기준</span>
        <a href={data.source_url} target="_blank" rel="noreferrer" className="font-semibold text-gray-400 underline decoration-gray-600 underline-offset-2 hover:text-white">
          KRX 원문 확인
        </a>
      </div>
    </Card>
  );
}
