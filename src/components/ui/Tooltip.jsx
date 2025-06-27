import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Tooltip({ content }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        aria-label="점수 의미 툴팁 열기"
        onClick={() => setOpen(!open)}
        className="text-white bg-blue-600 hover:bg-blue-500 text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold shadow-md"
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
            className="absolute z-50 top-7 -left-32 w-[330px] sm:w-[440px] md:w-[480px] max-w-[90vw] p-3 rounded-lg text-xs text-gray-200 bg-gray-900 shadow-xl"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
