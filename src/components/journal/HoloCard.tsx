"use client";

import { useEffect, useRef, type ReactNode } from "react";

const ease = (value: number) => value * value * (3 - 2 * value);

function rest(card: HTMLDivElement) {
  card.classList.remove("is-lit");
  card.style.setProperty("--px", "0.5");
  card.style.setProperty("--py", "0.35");
  card.style.setProperty("--rx", "0deg");
  card.style.setProperty("--ry", "0deg");
}

export function HoloCard({ children, label }: { children: ReactNode; label: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const card = cardRef.current;
    if (!stage || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lit = false;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reduce) return;
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const pad = 28;
      const inside = x >= -pad && y >= -pad && x <= rect.width + pad && y <= rect.height + pad;
      if (!inside) {
        if (lit) {
          lit = false;
          rest(card);
        }
        return;
      }
      const px = ease(Math.min(1, Math.max(0, x / rect.width)));
      const py = ease(Math.min(1, Math.max(0, y / rect.height)));
      if (!lit) {
        lit = true;
        card.classList.add("is-lit");
      }
      card.style.setProperty("--px", px.toFixed(4));
      card.style.setProperty("--py", py.toFixed(4));
      card.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
      card.style.setProperty("--ry", `${(px - 0.5) * 12}deg`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="holo-stage" ref={stageRef}>
      <div ref={cardRef} className="holo-card" aria-label={label}>
        <span className="holo-foil" aria-hidden="true" />
        <span className="holo-spark" aria-hidden="true" />
        <span className="holo-glare" aria-hidden="true" />
        <div className="holo-content">{children}</div>
      </div>
    </div>
  );
}
