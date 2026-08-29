"use client";

import { useEffect, useState } from "react";

const DEFAULT_COVER = "/covers/hushcity.jpg";

export function CoverImage({
  src,
  alt = "",
  className,
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_COVER);

  useEffect(() => setCurrentSrc(src || DEFAULT_COVER), [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== DEFAULT_COVER) setCurrentSrc(DEFAULT_COVER);
      }}
    />
  );
}
