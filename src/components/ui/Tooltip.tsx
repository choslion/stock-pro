import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  content: React.ReactNode;
}

export default function Tooltip({ content }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // 버튼이 화면 오른쪽 절반에 있으면 툴팁을 왼쪽으로 정렬
      setAlignRight(rect.left > window.innerWidth / 2);
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        aria-label="설명 보기"
        onClick={handleToggle}
        className="text-white bg-blue-600 hover:bg-blue-500 text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-md shrink-0"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute z-50 top-8 w-72 sm:w-96 max-w-[calc(100vw-2rem)] p-3 rounded-lg text-xs text-gray-200 bg-gray-900 shadow-xl ${
              alignRight ? "right-0" : "left-0"
            }`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
