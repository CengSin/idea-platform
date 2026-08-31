"use client";

import { DEFAULT_COVER, displayCoverUrl, isSiteMarkUrl, siteMarkUrl } from "@/lib/cover";
import { useEffect, useState } from "react";

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
  const resolved = displayCoverUrl(src, pageUrl);
  const [currentSrc, setCurrentSrc] = useState(resolved);

  useEffect(() => setCurrentSrc(displayCoverUrl(src, pageUrl)), [src, pageUrl]);

  const mark = isSiteMarkUrl(currentSrc);
  const onError = () => {
    const siteMark = pageUrl ? siteMarkUrl(pageUrl) : null;
    if (siteMark && currentSrc !== siteMark) {
      setCurrentSrc(siteMark);
      return;
    }
    if (currentSrc !== DEFAULT_COVER) setCurrentSrc(DEFAULT_COVER);
  };

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
