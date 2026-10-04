"use client";

import { Sparkles } from "lucide-react";
import { coverCandidates, DEFAULT_COVER, isDefaultCover, isSiteMarkUrl } from "@/lib/cover";
import { useEffect, useMemo, useRef, useState } from "react";

export function CoverImage({
  src,
  pageUrl,
  alt = "",
  className,
}: {
  src?: string;
  pageUrl?: string;
  alt?: string;
  className?: string;
}) {
  const candidates = useMemo(() => coverCandidates(src, pageUrl), [src, pageUrl]);
  const [index, setIndex] = useState(0);

  const candidateKey = candidates.join("\n");
  useEffect(() => setIndex(0), [candidateKey]);

  const currentSrc = candidates[Math.min(index, Math.max(candidates.length - 1, 0))] || DEFAULT_COVER;
  const onError = () => {
    setIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
  };

  // 图片可能在 React 接管前就已加载失败，这时 onError 不会触发，页面会一直停在坏图上。
  // 挂载/换图后补查一次：已结束加载但没有像素，就当失败处理，继续换下一个候选（最终落到默认封面）。
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) onError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSrc]);

  // 没有可用封面时不出坏图，也不放通用插画：浅色底 + 火花图标 + 作品名。
  if (isDefaultCover(currentSrc)) {
    const wrapperClass = [className?.replace(/\bobject-\S+/g, "").trim(), "flex flex-col items-center justify-center gap-2 overflow-hidden bg-[#f1f0eb] px-3 text-center"]
      .filter(Boolean)
      .join(" ");
    return (
      <span className={wrapperClass} role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
        </span>
        {alt ? <span className="line-clamp-2 max-w-full text-[12px] font-medium leading-snug text-slate-600" aria-hidden>{alt}</span> : null}
      </span>
    );
  }

  const mark = isSiteMarkUrl(currentSrc);
  if (mark) {
    const wrapperClass = [className?.replace(/\bobject-\S+/g, "").trim(), "flex items-center justify-center bg-canvas-soft"]
      .filter(Boolean)
      .join(" ");
    return (
      <span className={wrapperClass}>
        <img ref={imgRef} src={currentSrc} alt={alt} loading="lazy" decoding="async" className="h-[52%] w-[52%] object-contain" onError={onError} />
      </span>
    );
  }

  return <img ref={imgRef} src={currentSrc} alt={alt} loading="lazy" decoding="async" className={className} onError={onError} />;
}
