const KIND_SEARCH_URL = "https://kind.krx.co.kr/disclosure/details.do";
const KIND_SEARCH_PAGE = `${KIND_SEARCH_URL}?method=searchDetailsMain`;
const DISCLOSURE_GROUPS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "13", "14", "20",
];

function kstDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formPayload(date) {
  const form = new URLSearchParams({
    method: "searchDetailsSub",
    currentPageSize: "15",
    pageIndex: "1",
    orderMode: "",
    orderStat: "",
    forward: "details_sub",
    searchCodeType: "",
    repIsuSrtCd: "",
    allRepIsuSrtCd: "",
    oldSearchCorpName: "",
    disclosureType: "",
    disTypevalue: "",
    reportNm: "",
    reportCd: "",
    searchCorpName: "",
    business: "",
    marketType: "",
    kosdaqSegment: "",
    settlementMonth: "",
    securities: "",
    submitOblgNm: "",
    enterprise: "",
    fromDate: date,
    toDate: date,
    reportNmPop: "",
    reportNmTemp: "",
    bfrDsclsType: "on",
    lastReport: "5",
  });

  for (const group of DISCLOSURE_GROUPS) {
    const value = group === "02" ? "0347|" : "";
    form.set(`disclosureType${group}`, value);
    form.set(`pDisclosureType${group}`, value);
  }
  return form;
}

function cookieHeader(headers) {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie") ?? ""];
  return values
    .flatMap((value) => value.split(/,(?=[^;,]+=)/))
    .map((value) => value.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

const KIND_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept: "text/html, */*; q=0.01",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  origin: "https://kind.krx.co.kr",
  referer: KIND_SEARCH_PAGE,
  "x-requested-with": "XMLHttpRequest",
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ detail: "Method not allowed" });
  }

  try {
    const landing = await fetch(KIND_SEARCH_PAGE, { headers: KIND_HEADERS });
    if (!landing.ok) throw new Error(`KIND landing returned ${landing.status}`);

    const result = await fetch(KIND_SEARCH_URL, {
      method: "POST",
      headers: {
        ...KIND_HEADERS,
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        cookie: cookieHeader(landing.headers),
      },
      body: formPayload(kstDate()),
    });
    if (!result.ok) throw new Error(`KIND search returned ${result.status}`);

    const html = await result.text();
    if (html.includes('class="errorpage"')) throw new Error("KIND returned an error page");

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).send(html);
  } catch (error) {
    return response.status(502).json({
      detail: error instanceof Error ? error.message : "KRX KIND request failed",
    });
  }
}
