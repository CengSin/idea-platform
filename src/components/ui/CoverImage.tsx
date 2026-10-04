"use client";

import { coverCandidates, DEFAULT_COVER, isSiteMarkUrl } from "@/lib/cover";
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
