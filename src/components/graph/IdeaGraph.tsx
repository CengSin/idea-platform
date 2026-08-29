"use client";

import { SproutIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/Avatar";
import { useSheets } from "@/components/sheets/SheetContext";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import {
  ATTEMPT_STATUS_LABEL,
  effectiveAttemptStatus,
  ideaMetrics,
  relativeTime,
  userById,
  WORK_TYPE_LABEL,
} from "@/lib/format";
import { type Database, type Idea } from "@/lib/types";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function project(velocity: number, decelerationRate = 0.995) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function quadPath(x1: number, y1: number, x2: number, y2: number, bow = 48) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

const SPRING = { stiffness: 72, damping: 16 };

export function IdeaGraph({
  db,
  currentUserId,
}: {
  db: Database;
  currentUserId: string;
}) {
  const router = useRouter();
  const sheets = useSheets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"graph" | "list">("graph");
  const [tag, setTag] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const cam = useRef({ x: 560, y: 300, k: 1 });
  const [, setTick] = useState(0);
  const drag = useRef<{
    id: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);
  const vel = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);
  const spring = useRef({ vx: 0, vy: 0, vk: 0, tx: 0, ty: 0, tk: 1, last: 0 });

  const ideas = db.ideas.filter((i) => i.status !== "draft" && i.status !== "archived");
  const tags = Array.from(new Set(ideas.flatMap((i) => i.tags)));
  const q = query.trim().toLowerCase();

  const match = (idea: Idea) => {
    if (tag && !idea.tags.includes(tag)) return false;
    if (!q) return true;
    return (
      idea.title.toLowerCase().includes(q) ||
      idea.summary.toLowerCase().includes(q) ||
      idea.tags.some((t) => t.toLowerCase().includes(q)) ||
      idea.author.displayName.toLowerCase().includes(q)
    );
  };

  const selected = selectedId ? ideas.find((i) => i.id === selectedId) : undefined;

  const neighborhood = useMemo(() => {
    if (!selected) return { attempts: [], works: [], forks: [] };
    const attempts = db.attempts.filter(
      (a) => a.ideaId === selected.id && a.featuredOnGraph && a.graph,
    );
    const works = db.works.filter(
      (w) =>
        w.status === "published" &&
        w.graph &&
        attempts.some((a) => a.id === w.attemptId || a.workIds.includes(w.id)),
    );
    const forks = db.ideas
      .filter((i) => i.parentIdeaId === selected.id && i.status !== "draft")
      .slice(0, 3);
    return { attempts, works, forks };
  }, [db, selected]);

  const metrics = selected ? ideaMetrics(db, selected.id) : null;
  const myAttempt = selected
    ? db.attempts.find(
        (a) =>
          a.ideaId === selected.id &&
          a.ownerId === currentUserId &&
          a.status !== "abandoned",
      )
    : undefined;

  const paint = () => setTick((n) => n + 1);

  const applyCam = (x: number, y: number, k: number) => {
    cam.current = { x, y, k: Math.min(2.1, Math.max(0.32, k)) };
    paint();
  };

  const stopSpring = () => {
    cancelAnimationFrame(raf.current);
    spring.current.last = 0;
  };

  const runSpring = () => {
    if (prefersReducedMotion()) {
      applyCam(spring.current.tx, spring.current.ty, spring.current.tk);
      return;
    }
    stopSpring();
    const step = (now: number) => {
      const s = spring.current;
      if (!s.last) s.last = now;
      const dt = Math.min(0.032, (now - s.last) / 1000);
      s.last = now;
      const { x, y, k } = cam.current;
      const ax = -SPRING.stiffness * (x - s.tx) - SPRING.damping * s.vx;
      const ay = -SPRING.stiffness * (y - s.ty) - SPRING.damping * s.vy;
      const ak = -SPRING.stiffness * (k - s.tk) - SPRING.damping * s.vk;
      s.vx += ax * dt;
      s.vy += ay * dt;
      s.vk += ak * dt;
      const nx = x + s.vx * dt;
      const ny = y + s.vy * dt;
      const nk = k + s.vk * dt;
      applyCam(nx, ny, nk);
      const settled =
        Math.abs(nx - s.tx) < 0.35 &&
        Math.abs(ny - s.ty) < 0.35 &&
        Math.abs(nk - s.tk) < 0.002 &&
        Math.abs(s.vx) < 6 &&
        Math.abs(s.vy) < 6 &&
        Math.abs(s.vk) < 0.02;
      if (settled) {
        applyCam(s.tx, s.ty, s.tk);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const goToCam = (tx: number, ty: number, tk: number, animate: boolean) => {
    if (!animate || prefersReducedMotion()) {
      stopSpring();
      applyCam(tx, ty, tk);
      return;
    }
    spring.current = {
      vx: spring.current.vx,
      vy: spring.current.vy,
      vk: spring.current.vk,
      tx,
      ty,
      tk,
      last: 0,
    };
    runSpring();
  };

  const centerOn = (idea: Idea, animate = true, resetZoom = false) => {
    const el = viewport.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const k = resetZoom ? 1 : cam.current.k;
    const tx = (width - 316) / 2 - idea.graph.x * k;
    const ty = height / 2 - 80 - idea.graph.y * k;
    goToCam(tx, ty, k, animate);
  };

  const fitAll = (animate = true) => {
    const el = viewport.current;
    if (!el || ideas.length === 0) return;
    const { width, height } = el.getBoundingClientRect();
    const xs = ideas.map((i) => i.graph.x);
    const ys = ideas.map((i) => i.graph.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const leftPad = 48;
    const rightPad = 332;
    const topPad = 88;
    const bottomPad = 168;
    const availW = Math.max(180, width - leftPad - rightPad);
    const availH = Math.max(180, height - topPad - bottomPad);
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const margin = 160;
    const k = Math.min(
      1.05,
      Math.max(0.32, Math.min(availW / (worldW + margin * 2), availH / (worldH + margin * 2))),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = leftPad + availW / 2 - cx * k;
    const ty = topPad + availH / 2 - cy * k;
    goToCam(tx, ty, k, animate);
  };

  useEffect(() => {
    const run = () => {
      if (selected) centerOn(selected, false, true);
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(run));
    const onResize = () => run();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampPan = (x: number, y: number, k: number, loose = false) => {
    const el = viewport.current;
    if (!el) return { x, y };
    const { width, height } = el.getBoundingClientRect();
    const xs = ideas.map((i) => i.graph.x);
    const ys = ideas.map((i) => i.graph.y);
    const minX = Math.min(...xs) * k;
    const maxX = Math.max(...xs) * k;
    const minY = Math.min(...ys) * k;
    const maxY = Math.max(...ys) * k;
    const pad = 220;
    const minPanX = pad - maxX;
    const maxPanX = width - pad - minX;
    const minPanY = pad - maxY;
    const maxPanY = height - pad - minY;
    const cx = Math.min(maxPanX, Math.max(minPanX, x));
    const cy = Math.min(maxPanY, Math.max(minPanY, y));
    if (loose) {
      return {
        x: x < minPanX ? minPanX + rubberband(x - minPanX, width) : x > maxPanX ? maxPanX + rubberband(x - maxPanX, width) : x,
        y: y < minPanY ? minPanY + rubberband(y - minPanY, height) : y > maxPanY ? maxPanY + rubberband(y - maxPanY, height) : y,
      };
    }
    return { x: cx, y: cy };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (view !== "graph") return;
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    stopSpring();
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: cam.current.x,
      oy: cam.current.y,
      moved: false,
      samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.hypot(dx, dy) > 8) drag.current.moved = true;
    const next = clampPan(drag.current.ox + dx, drag.current.oy + dy, cam.current.k, true);
    applyCam(next.x, next.y, cam.current.k);
    const samples = drag.current.samples;
    samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
    if (samples.length > 5) samples.shift();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const { samples, moved } = drag.current;
    drag.current = null;
    if (!moved) {
      setSelectedId(null);
      fitAll(true);
      return;
    }
    if (prefersReducedMotion() || samples.length < 2) {
      const c = clampPan(cam.current.x, cam.current.y, cam.current.k);
      applyCam(c.x, c.y, cam.current.k);
      return;
    }
    const a = samples[0];
    const b = samples[samples.length - 1];
    const dt = Math.max(16, b.t - a.t);
    vel.current = { x: ((b.x - a.x) / dt) * 1000, y: ((b.y - a.y) / dt) * 1000 };
    const projected = {
      x: cam.current.x + project(vel.current.x),
      y: cam.current.y + project(vel.current.y),
    };
    const target = clampPan(projected.x, projected.y, cam.current.k);
    spring.current = {
      vx: vel.current.x,
      vy: vel.current.y,
      vk: 0,
      tx: target.x,
      ty: target.y,
      tk: cam.current.k,
      last: 0,
    };
    runSpring();
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    stopSpring();
    const el = viewport.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.94 : 1.06;
    const k = Math.min(2.1, Math.max(0.42, cam.current.k * factor));
    const nx = cx - ((cx - cam.current.x) * k) / cam.current.k;
    const ny = cy - ((cy - cam.current.y) * k) / cam.current.k;
    const clamped = clampPan(nx, ny, k);
    applyCam(clamped.x, clamped.y, k);
  };

  const { x, y, k } = cam.current;
  const events = [...db.events].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  const showLabels = k >= 0.48 || !selected;
  const hovered = hoverId ? ideas.find((i) => i.id === hoverId) : null;

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={viewport}
        data-graph-canvas
        className="absolute inset-0 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
      >
        <div
          className="graph-grid pointer-events-none absolute inset-0"
          style={{
            backgroundPosition: `${x * 0.06}px ${y * 0.06}px, ${x * 0.04}px ${y * 0.04}px, ${x * 0.03}px ${y * 0.03}px, ${x * 0.16}px ${y * 0.16}px, ${x * 0.12}px ${y * 0.12}px, ${x * 0.12}px ${y * 0.12}px`,
          }}
        />
        {view === "graph" ? (
          <div
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${x}px, ${y}px) scale(${k})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            <svg
              className="overflow-visible"
              width={1}
              height={1}
              style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
            >
              <defs>
                <radialGradient id="ideaFill" cx="38%" cy="32%" r="70%">
                  <stop offset="0%" stopColor="#FFE9C4" />
                  <stop offset="55%" stopColor="#E8B86A" />
                  <stop offset="100%" stopColor="#C4893A" />
                </radialGradient>
              </defs>
              {ideas.map((idea) => {
                if (!idea.parentIdeaId) return null;
                const parent = ideas.find((p) => p.id === idea.parentIdeaId);
                if (!parent) return null;
                const related =
                  idea.id === selected?.id ||
                  parent.id === selected?.id ||
                  idea.parentIdeaId === selected?.id;
                return (
                  <path
                    key={`kin-${idea.id}`}
                    d={quadPath(parent.graph.x, parent.graph.y, idea.graph.x, idea.graph.y, 22)}
                    fill="none"
                    stroke={related ? "rgba(232,184,106,0.38)" : "rgba(232,184,106,0.16)"}
                    strokeWidth={related ? 1.15 : 0.8}
                  />
                );
              })}
              {selected
                ? neighborhood.attempts.map((attempt) => {
                    const st = effectiveAttemptStatus(attempt);
                    const watching = st === "considering";
                    const dim =
                      st === "stalled" || st === "paused" || st === "abandoned";
                    const ax = attempt.graph!.x;
                    const ay = attempt.graph!.y;
                    const work = neighborhood.works.find(
                      (w) => w.attemptId === attempt.id || attempt.workIds.includes(w.id),
                    );
                    return (
                      <g key={attempt.id}>
                        <path
                          d={quadPath(selected.graph.x, selected.graph.y, ax, ay, watching ? 28 : 56)}
                          fill="none"
                          stroke={watching ? "rgba(102,199,192,0.45)" : "rgba(102,199,192,0.85)"}
                          strokeWidth={watching ? 1.4 : 2}
                          strokeDasharray={watching ? "5 6" : undefined}
                          opacity={dim ? 0.35 : 1}
                          className={
                            watching || dim ? "edge-draw-solid" : "edge-flow edge-draw"
                          }
                        />
                        {work?.graph ? (
                          <path
                            d={`M ${ax} ${ay} C ${ax + 70} ${ay}, ${work.graph.x - 90} ${work.graph.y}, ${work.graph.x - 108} ${work.graph.y}`}
                            fill="none"
                            stroke="rgba(242,239,232,0.55)"
                            strokeWidth="1.6"
                            className="edge-draw-solid"
                          />
                        ) : null}
                      </g>
                    );
                  })
                : null}
              {selected
                ? neighborhood.forks.map((fork) => (
                    <path
                      key={fork.id}
                      d={quadPath(
                        selected.graph.x,
                        selected.graph.y,
                        fork.graph.x,
                        fork.graph.y,
                        24,
                      )}
                      fill="none"
                      stroke="rgba(242,166,90,0.4)"
                      strokeWidth="1.2"
                      className="edge-draw-solid"
                    />
                  ))
                : null}
            </svg>

            {ideas.map((idea) => {
              const m = ideaMetrics(db, idea.id);
              const r = Math.min(30, 10 + m.workCount * 3 + m.activeAttemptCount * 1.4);
              const isSel = idea.id === selected?.id;
              const visible = match(idea);
              const isFork = idea.parentIdeaId === selected?.id;
              const distant = selected
                ? !isSel && idea.parentIdeaId !== selected.id && idea.id !== selected.parentIdeaId
                : false;
              const live = idea.status === "evolving" || idea.status === "realized";
              return (
                <button
                  key={idea.id}
                  data-node
                  type="button"
                  onClick={() => {
                    setSelectedId(idea.id);
                    centerOn(idea);
                  }}
                  onDoubleClick={() => router.push(`/ideas/${idea.id}`)}
                  onPointerEnter={() => setHoverId(idea.id)}
                  onPointerLeave={() => setHoverId((id) => (id === idea.id ? null : id))}
                  className="idea-node absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: idea.graph.x,
                    top: idea.graph.y,
                    opacity: visible ? (distant && !isFork ? 0.48 : 1) : 0.12,
                    zIndex: isSel ? 4 : hoverId === idea.id ? 3 : 1,
                    cursor: "pointer",
                  }}
                >
                  <span className="idea-node-inner">
                    <span
                      className={`idea-shell ${isSel ? "is-selected" : live ? "is-live" : ""} ${idea.status === "dormant" ? "is-dormant" : ""}`}
                      style={{ width: r * 2, height: r * 2 }}
                    >
                      <span className="idea-bloom" />
                      {live || isSel ? <span className="idea-orbit" /> : null}
                      {isSel ? <span className="idea-orbit outer" /> : null}
                      {m.workCount > 0 ? <span className="idea-orbit work" /> : null}
                      <span className="idea-orb">
                        <span className="idea-spec" />
                        {r >= 14 ? <SproutIcon className="idea-core" /> : null}
                      </span>
                      {m.workCount > 0 && !isSel ? (
                        <span className="idea-badge">{m.workCount}</span>
                      ) : null}
                    </span>
                    {showLabels && !isSel ? (
                      <span
                        className="idea-label"
                        style={{
                          color: hoverId === idea.id ? "#f6f0e6" : "rgba(246,240,230,0.78)",
                        }}
                      >
                        {idea.title}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}

            {neighborhood.attempts.map((attempt, i) => {
              const owner = userById(db, attempt.ownerId);
              const st = effectiveAttemptStatus(attempt);
              const watching = st === "considering";
              return (
                <div
                  key={attempt.id}
                  data-node
                  className="rise-in absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{
                    left: attempt.graph!.x,
                    top: attempt.graph!.y,
                    animationDelay: `${80 + i * 50}ms`,
                    zIndex: 2,
                  }}
                >
                  <div
                    className={`attempt-shell ${watching ? "is-watch" : ""}`}
                    style={{ width: watching ? 34 : 44, height: watching ? 34 : 44 }}
                  >
                    <span className="attempt-bloom" />
                    <span className="attempt-ring" />
                    <Avatar
                      className="relative z-[1]"
                      initials={owner?.initials ?? "·"}
                      accent={owner?.accent ?? "#6fd4cb"}
                      size={watching ? 28 : 36}
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="idea-label max-w-[120px] text-artifact">
                      {owner?.displayName ?? attempt.title}
                    </div>
                    <div className="text-[11px] text-active/80">
                      {ATTEMPT_STATUS_LABEL[st]}
                    </div>
                  </div>
                </div>
              );
            })}

            {neighborhood.works.map((work, i) => (
              <Link
                key={work.id}
                data-node
                href={`/works/${work.id}`}
                className="glass lift media-zoom rise-in absolute w-[200px] -translate-y-1/2 overflow-hidden rounded-[20px]"
                style={{
                  left: work.graph!.x - 100,
                  top: work.graph!.y,
                  animationDelay: `${140 + i * 70}ms`,
                  zIndex: 2,
                }}
              >
                <CoverImage src={work.coverUrl} className="h-[108px] w-full object-cover" />
                <div className="px-3 py-2.5">
                  <div className="text-[14px] font-medium tracking-[-0.02em]">{work.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted">
                    <span>{WORK_TYPE_LABEL[work.type]}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {work.saves}
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {selected && metrics ? (
              <div
                key={selected.id}
                data-node
                className="glass-heavy rise-in absolute w-[336px] -translate-x-1/2 rounded-3xl p-4"
                style={{
                  left: selected.graph.x,
                  top: selected.graph.y + Math.min(30, 10 + metrics.workCount * 3 + metrics.activeAttemptCount * 1.4) + 22,
                  zIndex: 5,
                }}
              >
                <Link href={`/ideas/${selected.id}`} className="block">
                  <h2 className="text-[20px] font-semibold leading-[1.2] tracking-[-0.035em] text-balance">
                    {selected.title}
                  </h2>
                </Link>
                <p className="mt-2 text-[12.5px] text-muted">
                  {metrics.totalAttemptCount} 人承接 · {metrics.workCount} 个作品 ·{" "}
                  {relativeTime(selected.updatedAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.tags.slice(0, 3).map((t) => (
                    <Chip key={t} tone="idea">
                      {t}
                    </Chip>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <Button
                    tone="idea"
                    className="w-full"
                    onClick={() =>
                      myAttempt
                        ? router.push(`/attempts/${myAttempt.id}`)
                        : sheets.openAdopt(selected)
                    }
                  >
                    <Users className="h-4 w-4" />
                    {myAttempt ? "查看我的承接" : "承接这个想法"}
                  </Button>
                </div>
              </div>
            ) : null}

            {hovered && hovered.id !== selected?.id ? (
              <div
                className="glass pointer-events-none absolute w-[220px] rounded-2xl px-3 py-2.5"
                style={{
                  left: hovered.graph.x + 28,
                  top: hovered.graph.y,
                  transform: "translateY(-50%)",
                  zIndex: 6,
                }}
              >
                <div className="text-[13px] tracking-[-0.02em] text-artifact">{hovered.title}</div>
                <div className="mt-1 text-[12px] leading-snug text-muted">{hovered.summary}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0 overflow-auto pb-16 pl-8 pr-[332px] pt-36">
            <div className="stagger-in grid grid-cols-2 gap-4 xl:grid-cols-3">
              {ideas.filter(match).map((idea) => {
                const m = ideaMetrics(db, idea.id);
                return (
                  <Link
                    key={idea.id}
                    href={`/ideas/${idea.id}`}
                    className="glass lift pressable rounded-3xl p-5"
                  >
                    <div className="mb-3 flex gap-1.5">
                      {idea.tags.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.03em]">{idea.title}</h3>
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                      {idea.summary}
                    </p>
                    <p className="mt-4 text-[12px] text-muted">
                      {m.activeAttemptCount} 个有效承接 · {m.workCount} 个作品 · {m.forkCount} 次衍生
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        {view === "graph" ? <div className="graph-vignette" /> : null}
      </div>

      {ideas.length === 0 ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-[332px] z-20 grid place-items-center px-8">
          <div className="pointer-events-auto max-w-md text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-idea/30 bg-idea/10 text-idea shadow-[0_0_36px_rgba(232,184,106,0.2)]">
              <SproutIcon className="h-9 w-9" />
            </span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.04em]">
              从你的第一个想法开始
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              这里还是一张空白的未来地图。发布一个你真正希望有人实现的项目。
            </p>
            <Button tone="idea" className="mt-6 px-5 py-3" onClick={sheets.openPublishIdea}>
              发布第一个 Idea
            </Button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="overlay-in pointer-events-auto absolute left-4 right-[332px] top-4">
          <div className="glass mx-auto flex h-12 max-w-[720px] items-center gap-3 rounded-full px-4">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索一个尚未发生的未来…"
              className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => setView(view === "graph" ? "list" : "graph")}
              className="pressable shrink-0 rounded-full px-3 py-1 text-[12px] text-muted hover:bg-white/6 hover:text-artifact"
            >
              {view === "graph" ? "列表" : "Graph"}
            </button>
          </div>
          {view === "list" ? (
            <div className="mx-auto mt-3 flex max-w-[720px] flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setTag(null)}
                className={`pressable rounded-full border px-3 py-1 text-[12px] ${tag === null ? "border-idea/40 bg-idea/10 text-idea" : "border-white/10 text-muted hover:text-artifact"}`}
              >
                全部主题
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  className={`pressable rounded-full border px-3 py-1 text-[12px] ${tag === t ? "border-idea/40 bg-idea/10 text-idea" : "border-white/10 text-muted hover:text-artifact"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="overlay-in-right pointer-events-auto absolute bottom-4 right-4 top-4 flex w-[300px] flex-col">
          <div className="glass-heavy flex min-h-0 flex-1 flex-col rounded-[28px] p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]">
              <span className="live-dot" />
              正在发生
            </h2>
            <div className="mt-4 flex-1 space-y-1 overflow-auto pr-1">
              {events.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-[12.5px] leading-relaxed text-muted">
                  还没有动态。发布或承接项目后，进展会出现在这里。
                </p>
              ) : null}
              {events.map((ev) => {
                const u = userById(db, ev.actorId);
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 rounded-2xl px-1 py-2.5 transition-colors hover:bg-white/6"
                  >
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px]"
                      style={{
                        color: u?.accent ?? "#66C7C0",
                        borderColor: `${u?.accent ?? "#66C7C0"}66`,
                        background: `${u?.accent ?? "#66C7C0"}18`,
                      }}
                    >
                      {u?.initials ?? "·"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-[13.5px]">{ev.actorName}</div>
                        <div className="shrink-0 text-[11px] text-muted">
                          {relativeTime(ev.at)}
                        </div>
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">{ev.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => (selected ? centerOn(selected, true, true) : fitAll(true))}
            disabled={ideas.length === 0}
            title="将所有想法重新居中并缩放到可见范围"
            className="glass pressable mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl text-[13.5px] hover:bg-white/6"
          >
            <SlidersHorizontal className="h-4 w-4" />
            整理视图
          </button>
        </aside>

        {view === "graph" ? (
          <div className="glass overlay-in pointer-events-auto absolute bottom-5 left-4 rounded-2xl px-4 py-3 text-[12px] text-muted">
            <LegendDot color="#F2A65A" label="想法（按承接人数）" />
            <LegendDot color="#66C7C0" label="承接者（进行中）" />
            <LegendDot color="#3d8f8a" label="关注者（观察中）" ring />
            <LegendDot color="#F2EFE8" label="作品（已完成）" square />
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-px w-6 bg-active" />
              进行中
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-6 border-t border-dashed border-active/70" />
              观察中
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  ring,
  square,
}: {
  color: string;
  label: string;
  ring?: boolean;
  square?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span
        className={square ? "h-2.5 w-3.5 rounded-[2px]" : "h-2.5 w-2.5 rounded-full"}
        style={{
          background: ring ? "transparent" : color,
          border: `1.5px solid ${color}`,
        }}
      />
      {label}
    </div>
  );
}
