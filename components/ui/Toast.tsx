'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const borderColors = {
  success: 'border-l-feedback-correct',
  error: 'border-l-feedback-wrong',
  info: 'border-l-accent',
};

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`
        pointer-events-auto w-[calc(100vw-2rem)] sm:w-80
        bg-panel backdrop-blur-lg
        border-2 border-edge-strong border-l-[5px] ${borderColors[type]}
        rounded-md shadow-xl
        px-4 py-3.5
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug font-bold text-ink">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 text-ink-tertiary hover:text-ink transition-colors text-base leading-none mt-0.5 font-black"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
