import { useRef, useCallback } from "react";

/**
 * 접근성을 갖춘 탭 목록.
 * - 모바일: 가로 스크롤 (스크롤바 숨김, 우측 페이드 힌트)
 * - sm(640px)+: flex-wrap으로 자연스럽게 줄바꿈
 * - 키보드: ←→ Home End 로 탭 이동, Enter/Space 로 선택
 *
 * props:
 *   tabs      - [{ id, label }]
 *   activeId  - 현재 활성 탭 id
 *   onChange  - (id) => void
 *   ariaLabel - 탭 목록 레이블 (스크린리더용)
 */
export default function ScrollTabs({ tabs, activeId, onChange, ariaLabel }) {
  const listRef = useRef(null);

  const focusTab = useCallback((idx) => {
    const btns = listRef.current?.querySelectorAll('[role="tab"]');
    const btn = btns?.[idx];
    if (!btn) return;
    btn.focus();
    btn.scrollIntoView({ inline: "nearest", behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (e, idx) => {
      const count = tabs.length;
      let next = null;
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

      {/* 모바일 전용: 더 탭이 있다는 우측 페이드 힌트 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-8
                   bg-gradient-to-l from-gray-800 to-transparent sm:hidden"
      />
    </div>
  );
}
