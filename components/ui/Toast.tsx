'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const borderColors = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-[#F59E0B]',
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
        pointer-events-auto w-72
        bg-white/[0.08] backdrop-blur-lg
        border border-white/[0.1] border-l-2 ${borderColors[type]}
        rounded-sm shadow-xl
        px-4 py-3
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-white/80">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 text-white/30 hover:text-white/60 transition-colors text-sm leading-none mt-0.5"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
