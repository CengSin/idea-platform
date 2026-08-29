"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-[#1a1410]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={`glass-heavy relative max-h-[88vh] overflow-auto rounded-3xl p-6 shadow-[0_28px_90px_rgba(20,12,6,0.4)] ${wide ? "w-[min(760px,100%)]" : "w-[min(520px,100%)]"}`}
            initial={{ opacity: 0, scale: 0.96, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, y: 10, filter: "blur(6px)" }}
            transition={{ type: "spring", bounce: 0, duration: 0.36 }}
          >
            <div className="mb-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-artifact">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
