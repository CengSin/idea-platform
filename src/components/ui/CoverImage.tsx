"use client";

import { coverCandidates, DEFAULT_COVER, isSiteMarkUrl } from "@/lib/cover";
import { useEffect, useMemo, useState } from "react";

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

  const mark = isSiteMarkUrl(currentSrc);
  if (mark) {
    const wrapperClass = [className?.replace(/\bobject-\S+/g, "").trim(), "flex items-center justify-center bg-canvas-soft"]
      .filter(Boolean)
      .join(" ");
    return (
      <span className={wrapperClass}>
        <img src={currentSrc} alt={alt} className="h-[52%] w-[52%] object-contain" onError={onError} />
      </span>
    );
  }

  return <img src={currentSrc} alt={alt} className={className} onError={onError} />;
}
