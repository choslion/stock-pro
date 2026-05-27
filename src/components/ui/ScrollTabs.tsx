import { useRef, useCallback, useState, useEffect } from "react";

export interface Tab {
  id:    string;
  label: string;
}

interface ScrollTabsProps {
  tabs:       Tab[];
  activeId:   string;
  onChange:   (id: string) => void;
  ariaLabel?: string;
}

export default function ScrollTabs({ tabs, activeId, onChange, ariaLabel }: ScrollTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade]   = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 1);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateFades();
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFades, tabs]);

  const focusTab = useCallback((idx: number) => {
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const btn = btns?.[idx];
    if (!btn) return;
    btn.focus();
    btn.scrollIntoView({ inline: "nearest", behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      const count = tabs.length;
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (idx + 1) % count;
      else if (e.key === "ArrowLeft") next = (idx - 1 + count) % count;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = count - 1;
      if (next !== null) {
        e.preventDefault();
        onChange(tabs[next].id);
        focusTab(next);
      }
    },
    [tabs, onChange, focusTab],
  );

  return (
    <div className="relative">
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        onScroll={updateFades}
        className="flex gap-2 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeId === tab.id}
            tabIndex={activeId === tab.id ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
              focus-visible:ring-offset-1 focus-visible:ring-offset-gray-800
              ${
                activeId === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 좌측 페이드 — 스크롤이 시작점에서 벗어났을 때만 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 h-full w-8
                    bg-gradient-to-r from-gray-800 to-transparent sm:hidden
                    transition-opacity duration-200 ${showLeftFade ? "opacity-100" : "opacity-0"}`}
      />
      {/* 우측 페이드 — 스크롤이 끝에 도달하면 사라짐 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 top-0 h-full w-8
                    bg-gradient-to-l from-gray-800 to-transparent sm:hidden
                    transition-opacity duration-200 ${showRightFade ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
