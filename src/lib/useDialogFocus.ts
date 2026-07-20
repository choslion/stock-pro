import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * 모달/바텀시트 접근성 초점 관리.
 * - 열려 있는 동안 Tab/Shift+Tab이 panelRef 안에서만 순환 (초점 트랩)
 * - 언마운트 시 모달을 열었던 요소로 초점 복귀
 *
 * @param enabled 트랩 활성 여부 — 위에 다른 모달이 겹쳐 열리면 false로 내려서 트랩 충돌을 방지
 */
export function useDialogFocus(panelRef: RefObject<HTMLElement | null>, enabled = true) {
  /* 닫힐 때 초점 복귀 — 트랩 활성 여부와 무관하게 마운트 시점의 초점을 기억 */
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  /* Tab 트랩 */
  useEffect(() => {
    if (!enabled) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!nodes.length) { event.preventDefault(); return; }

      const first  = nodes[0];
      const last   = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [panelRef, enabled]);
}
