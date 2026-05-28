import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "오늘 시장 분위기 어때?",
  "코스피 최근 흐름 알려줘",
  "달러 환율이 주식에 미치는 영향은?",
  "나스닥이랑 코스닥 상관관계 설명해줘",
];

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "";

export default function AIChatSection() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const abortRef   = useRef<AbortController | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history = messages;
    const next: Message[] = [...history, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: trimmed, history }),
        signal:  ctrl.signal,
      });

      if (!res.body) throw new Error("no body");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            assistantContent += (JSON.parse(data) as { text: string }).text;
            setMessages([...next, { role: "assistant", content: assistantContent }]);
          } catch { /* partial chunk */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages([...next, { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, streaming]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] max-w-2xl mx-auto">

      {/* 헤더 */}
      <div className="pb-3 border-b border-gray-800/60 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">AI 주식 어시스턴트</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">
            현재 시장 데이터 연동
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">시장·종목·경제에 대해 무엇이든 물어보세요</p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.length === 0 ? (
          <div className="space-y-5 pt-4">
            <p className="text-center text-gray-600 text-xs">추천 질문</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-700/60
                             text-xs text-gray-400 hover:text-gray-200 transition-colors border border-gray-800/60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <span className="w-6 h-6 mr-2 mt-0.5 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-[10px] font-bold shrink-0">
                  AI
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-gray-800/80 text-gray-200 rounded-bl-sm"
                  }`}
              >
                {msg.content || (streaming && i === messages.length - 1
                  ? <span className="inline-flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  : ""
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="pt-3 border-t border-gray-800/60">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="질문을 입력하세요..."
              disabled={streaming}
              maxLength={50}
              className="w-full bg-gray-800/60 rounded-xl px-4 py-2.5 text-sm text-white
                         placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500/60
                         disabled:opacity-50 transition-all pr-12"
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums
              ${input.length >= 45 ? "text-red-400" : "text-gray-600"}`}>
              {input.length}/50
            </span>
          </div>
          <button
            onClick={() => streaming ? abortRef.current?.abort() : send(input)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${streaming
                ? "bg-red-600/80 hover:bg-red-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
              }`}
            disabled={!streaming && !input.trim()}
          >
            {streaming ? "중단" : "전송"}
          </button>
        </div>
        <p className="text-[10px] text-gray-700 mt-1.5 text-center">
          AI 답변은 참고용입니다. 투자 결정은 본인 판단으로 하세요.
        </p>
      </div>
    </div>
  );
}
