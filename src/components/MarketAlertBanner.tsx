import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { MarketEvent } from "../types/api";
import { AlertTriangleIcon } from "./ui/Icons";

const ACTIVE_REFETCH_MS = 15_000;
const IDLE_REFETCH_MS = 5 * 60_000;

function isKrxMarketWindow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  return !["Sat", "Sun"].includes(weekday) && minutes >= 9 * 60 && minutes <= 15 * 60 + 40;
}

function formatKstTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function eventCopy(event: MarketEvent) {
  const occurred = formatKstTime(event.occurred_at);
  const direction = event.direction === "buy" ? "매수" : "매도";

  if (event.kind === "sidecar") {
    return {
      badge: `${direction} 사이드카`,
      heading: `${event.market} 프로그램 ${direction}호가 효력 정지`,
      detail: `프로그램 ${direction}호가 효력이 5분간 정지됩니다.`,
      timing: `${occurred} 발동 · ${formatKstTime(event.ends_at)} 해제 예정`,
      tone: "border-amber-400/50 bg-amber-400/10 text-amber-100",
      iconTone: "bg-amber-400/20 text-amber-300",
      badgeTone: "bg-amber-300/20 text-amber-200",
    };
  }

  const phase = event.phase ? ` ${event.phase}단계` : "";
  if (event.phase === 3) {
    return {
      badge: `서킷브레이커${phase}`,
      heading: `${event.market} 당일 시장 종료`,
      detail: "서킷브레이커 3단계 발동으로 당일 거래가 종료되었습니다.",
      timing: `${occurred} 발동`,
      tone: "border-red-400/50 bg-red-500/10 text-red-100",
      iconTone: "bg-red-400/20 text-red-300",
      badgeTone: "bg-red-300/20 text-red-200",
    };
  }

  const recovering = event.status === "recovery";
  return {
    badge: `서킷브레이커${phase}`,
    heading: recovering ? `${event.market} 단일가 매매 진행 중` : `${event.market} 전체 매매 일시중단`,
    detail: recovering
      ? "매매 재개를 위한 10분간의 단일가 절차가 진행 중입니다."
      : "전체 매매가 20분간 일시중단되었습니다.",
    timing: recovering
      ? `${occurred} 발동 · ${formatKstTime(event.ends_at)} 연속매매 재개 예정`
      : `${occurred} 발동 · ${formatKstTime(event.halt_ends_at)} 단일가 절차 시작`,
    tone: "border-red-400/50 bg-red-500/10 text-red-100",
    iconTone: "bg-red-400/20 text-red-300",
    badgeTone: "bg-red-300/20 text-red-200",
  };
}

export default function MarketAlertBanner() {
  const { data } = useQuery({
    queryKey: Q.marketEvents(),
    queryFn: fetchers.marketEvents,
    staleTime: 10_000,
    refetchInterval: () => isKrxMarketWindow() ? ACTIVE_REFETCH_MS : IDLE_REFETCH_MS,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  if (!data?.active_events.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-30 px-4 lg:left-44 lg:top-4">
      <div className="pointer-events-auto mx-auto max-w-3xl space-y-2">
        {data.active_events.map((event) => {
          const copy = eventCopy(event);
          return (
            <section
              key={event.id}
              role="alert"
              aria-label={`${copy.badge} 알림`}
              className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${copy.tone}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${copy.iconTone}`}>
                  <AlertTriangleIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${copy.badgeTone}`}>
                      {copy.badge}
                    </span>
                    <span className="text-[11px] text-gray-300 tabular-nums">{copy.timing}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-white">{copy.heading}</p>
                  <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-xs text-gray-200">{copy.detail}</p>
                    <a
                      href={data.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-gray-300 underline decoration-gray-500 underline-offset-2 hover:text-white"
                    >
                      KRX 공지 확인
                    </a>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
