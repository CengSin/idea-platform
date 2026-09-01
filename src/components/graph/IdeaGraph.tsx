"use client";

import { IdeaOverview } from "./IdeaOverview";
import { ActivityDigest } from "./ActivityDigest";
import { MobileIdeaFocus } from "./MobileIdeaFocus";
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
import { ideaGrowthPath } from "@/lib/idea-graph";
import { type Database, type Idea } from "@/lib/types";
import { ArrowLeft, Plus, Search, SlidersHorizontal, Users, X } from "lucide-react";
import Link from "@/components/ui/NavigationLink";
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
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"graph" | "list">("graph");
  const [tag, setTag] = useState<string | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const overview = useRef<HTMLDivElement>(null);
  const overviewScroll = useRef(0);
  const returnFocusId = useRef<string | null>(null);
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

  const ideas = useMemo(() => db.ideas.filter((i) => i.status !== "draft" && i.status !== "archived"), [db.ideas]);
  const tags = useMemo(() => Array.from(new Set(ideas.flatMap((i) => i.tags))), [ideas]);
  const metricsById = useMemo(() => new Map(ideas.map((idea) => [idea.id, ideaMetrics(db, idea.id)])), [db, ideas]);
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
    if (!selected) return { attempts: [], works: [] };
    return ideaGrowthPath(db, selected.id);
  }, [db, selected]);

  const isFocus = view === "graph" && Boolean(selected);
  const filteredIdeas = ideas.filter(match);

  const metrics = selected ? metricsById.get(selected.id)! : null;
  const selectedRadius = metrics
    ? Math.min(30, 10 + metrics.workCount * 3 + metrics.activeAttemptCount * 1.4)
    : 0;
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
    const attempts = db.attempts.filter((a) => a.ideaId === idea.id && a.featuredOnGraph && a.graph);
    const works = db.works.filter((w) => w.status === "published" && w.graph && attempts.some((a) => a.id === w.attemptId || a.workIds.includes(w.id)));
    const minX = Math.min(idea.graph.x - 184, ...attempts.map((a) => a.graph!.x - 80), ...works.map((w) => w.graph!.x - 112));
    const maxX = Math.max(idea.graph.x + 184, ...attempts.map((a) => a.graph!.x + 80), ...works.map((w) => w.graph!.x + 112));
    const minY = Math.min(idea.graph.y - 50, ...attempts.map((a) => a.graph!.y - 45), ...works.map((w) => w.graph!.y - 110));
    const maxY = Math.max(idea.graph.y + 310, ...attempts.map((a) => a.graph!.y + 65), ...works.map((w) => w.graph!.y + 110));
    const side = window.innerWidth < 768 ? 0 : 332;
    const availableW = Math.max(180, width - side - 32);
    const availableH = Math.max(200, height - 168);
    const k = resetZoom ? Math.min(1, Math.max(0.32, Math.min(availableW / (maxX - minX), availableH / (maxY - minY)))) : cam.current.k;
    goToCam(16 + availableW / 2 - (minX + maxX) / 2 * k, 104 + availableH / 2 - (minY + maxY) / 2 * k, k, animate);
  };

  const selectIdea = (idea: Idea) => {
    returnFocusId.current = idea.id;
    setView("graph");
    setSelectedId(idea.id);
    centerOn(idea, true, true);
  };

  const showOverview = () => {
    stopSpring();
    setSelectedId(null);
  };

  useEffect(() => {
    if (isFocus || !overview.current) return;
    overview.current.scrollTop = overviewScroll.current;
    const button = Array.from(overview.current.querySelectorAll<HTMLButtonElement>("button[data-idea-id]"))
      .find((item) => item.dataset.ideaId === returnFocusId.current);
    button?.focus({ preventScroll: true });
    returnFocusId.current = null;
  }, [isFocus]);

  useEffect(() => {
    const run = () => { if (selected && view === "graph") centerOn(selected, false, true); };
    const id = requestAnimationFrame(run);
    window.addEventListener("resize", run);
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", run);
    };
    // Refit only when selection/view changes, not on every camera frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, view]);

  const clampPan = (x: number, y: number, k: number, loose = false) => {
    const el = viewport.current;
    if (!el) return { x, y };
    const { width, height } = el.getBoundingClientRect();
    const points = [selected!.graph, ...neighborhood.attempts.map((attempt) => attempt.graph!), ...neighborhood.works.map((work) => work.graph!)];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
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
    if (!isFocus) return;
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
      showOverview();
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
    if (!isFocus) return;
    e.preventDefault();
    stopSpring();
    const el = viewport.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.94 : 1.06;
    const k = Math.min(2.1, Math.max(0.32, cam.current.k * factor));
    const nx = cx - ((cx - cam.current.x) * k) / cam.current.k;
    const ny = cy - ((cy - cam.current.y) * k) / cam.current.k;
    const clamped = clampPan(nx, ny, k);
    applyCam(clamped.x, clamped.y, k);
  };

  const { x, y, k } = cam.current;

  return (
    <div className="discovery-page relative h-full min-h-0">
      <div
        ref={viewport}
        data-graph-canvas
        className="absolute inset-0 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        style={{ cursor: !isFocus ? "auto" : drag.current ? "grabbing" : "grab", touchAction: isFocus ? "none" : "pan-y" }}
      >
        <div
          className="graph-grid pointer-events-none absolute inset-0"
          style={{
            backgroundPosition: `${x * 0.06}px ${y * 0.06}px, ${x * 0.04}px ${y * 0.04}px, ${x * 0.03}px ${y * 0.03}px, ${x * 0.16}px ${y * 0.16}px, ${x * 0.12}px ${y * 0.12}px, ${x * 0.12}px ${y * 0.12}px`,
          }}
        />
        {isFocus ? (
          <div
            className="discovery-focus-canvas absolute left-0 top-0"
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
            </svg>

            {selected && metrics ? (
              <button
                key={selected.id}
                data-node
                type="button"
                aria-label={`展开 ${selected.title}`}
                aria-pressed="true"
                onDoubleClick={() => router.push(`/ideas/${selected.id}`)}
                className="idea-node absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: selected.graph.x,
                  top: selected.graph.y,
                  zIndex: 4,
                  cursor: "pointer",
                }}
              >
                <span className="idea-node-inner">
                  <span
                    className={`idea-shell is-selected ${selected.status === "dormant" ? "is-dormant" : ""}`}
                    style={{
                      width: selectedRadius * 2,
                      height: selectedRadius * 2,
                    }}
                  >
                    <span className="idea-bloom" />
                    <span className="idea-orbit" />
                    <span className="idea-orbit outer" />
                    {metrics.workCount > 0 ? <span className="idea-orbit work" /> : null}
                    <span className="idea-orb">
                      <span className="idea-spec" />
                      <SproutIcon className="idea-core" />
                    </span>
                  </span>
                </span>
              </button>
            ) : null}

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
                <CoverImage src={work.coverUrl} pageUrl={work.externalUrl} className="h-[108px] w-full object-cover" />
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
                  <Link href={`/ideas/${selected.id}`} className="explore-secondary w-full">查看想法详情</Link>
                  {myAttempt ? <Link href={`/attempts/${myAttempt.id}`} className="explore-cta w-full"><Users className="h-4 w-4" />查看我的承接</Link> : (
                  <Button
                    tone="idea"
                    className="w-full"
                    onClick={() => sheets.openAdopt(selected)}
                  >
                    <Users className="h-4 w-4" />
                    承接这个想法
                  </Button>
                  )}
                </div>
              </div>
            ) : null}

          </div>
        ) : (
          <div ref={overview} onScroll={(e) => { overviewScroll.current = e.currentTarget.scrollTop; }} className="discovery-overview scroll-thin" data-node>
            {ideas.length > 0 ? <>
              <header className="discovery-intro">
                <h1>想法，正在长成作品<span>。</span></h1>
                <p className="discovery-intro-note">发现值得实现的想法，也看见它们走过的路。</p>
                <div className="discovery-filter-row">
                  <span className="discovery-total" role="status">{filteredIdeas.length} 个想法 · {filteredIdeas.reduce((sum, idea) => sum + metricsById.get(idea.id)!.workCount, 0)} 个作品</span>
                  {tags.length > 0 ? <div className="discovery-filters" aria-label="按主题筛选">
                    <button type="button" aria-pressed={tag === null} onClick={() => setTag(null)}>全部</button>
                    {tags.map((item) => <button type="button" key={item} aria-pressed={tag === item} onClick={() => setTag(tag === item ? null : item)}>{item}</button>)}
                  </div> : null}
                </div>
              </header>
              {filteredIdeas.length > 0 ? <IdeaOverview db={db} ideas={filteredIdeas} metricsById={metricsById} onSelect={selectIdea} list={view === "list"} /> : (
                <div className="discovery-no-results" role="status">
                  <Search aria-hidden="true" className="h-6 w-6 text-idea" />
                  <h2>还没有找到这个想法</h2>
                  <p>换个关键词，或清除主题筛选再看看。</p>
                  <button type="button" onClick={() => { setQuery(""); setTag(null); }}>清除筛选</button>
                </div>
              )}
              <p className="discovery-map-note"><span className="discovery-dot" />想法<span className="discovery-note-line" /><span className="discovery-dot active" />承接<span className="discovery-note-line" /><span className="discovery-dot work" />作品<span className="discovery-note-hint">每一条路径，都从一个想法开始</span></p>
            </> : null}
          </div>
        )}
        {isFocus ? <div className="graph-vignette" /> : null}
      </div>

      {isFocus && selected ? <MobileIdeaFocus db={db} idea={selected} myAttempt={myAttempt} onAdopt={() => sheets.openAdopt(selected)} /> : null}

      {ideas.length === 0 ? (
        <div className="graph-empty pointer-events-none absolute inset-y-0 left-0 right-[332px] z-20 grid place-items-center px-8">
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
        <div className="graph-toolbar pointer-events-auto absolute left-4 right-[332px] top-4">
          <div className="discovery-toolbar-row">
            <div className="discovery-search glass">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
              <input value={query} onChange={(e) => { setQuery(e.target.value); if (selected) showOverview(); }} placeholder="搜索一个尚未发生的未来…" aria-label="搜索想法" />
              {query ? <button type="button" aria-label="清除搜索" onClick={() => setQuery("")}><X className="h-4 w-4" /></button> : null}
            </div>
            <button type="button" className="discovery-view-toggle glass pressable" onClick={() => { showOverview(); setView(view === "graph" ? "list" : "graph"); }} aria-label={view === "graph" ? "切换到列表" : "切换到项目地图"}>{view === "graph" ? "列表" : "项目地图"}</button>
            <Button tone="idea" className="discovery-publish" onClick={sheets.openPublishIdea}><Plus aria-hidden="true" className="h-4 w-4" /><span>发布想法</span></Button>
          </div>
          {isFocus ? <button type="button" className="discovery-back glass pressable" onClick={showOverview}><ArrowLeft aria-hidden="true" className="h-4 w-4" />返回项目地图</button> : null}
        </div>

        <aside className="graph-activity pointer-events-auto absolute right-4 top-[96px] bottom-5 flex w-[300px] flex-col gap-4">
          <ActivityDigest db={db} ideas={ideas} onSelect={selectIdea} />
          <div className="discovery-sidebar-note"><SproutIcon aria-hidden="true" className="h-5 w-5" /><p>一个想法，可以有很多种实现。<br />找到你在意的，开始下一条路径。</p></div>
          {isFocus ? <button type="button" onClick={() => selected && centerOn(selected, true, true)} className="glass pressable mt-auto flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl text-[13.5px] hover:bg-white/6"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />整理视图</button> : null}
        </aside>

        {isFocus ? (
          <div className="graph-legend glass pointer-events-auto absolute bottom-5 left-4 flex flex-wrap items-center gap-x-4 rounded-2xl px-4 py-2 text-[11px] text-muted">
            <LegendDot color="#F2A65A" label="想法" />
            <LegendDot color="#66C7C0" label="承接" />
            <LegendDot color="#F2EFE8" label="作品" square />
            <span>拖动平移 · 滚轮缩放</span>
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
