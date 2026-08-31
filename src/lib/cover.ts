export const DEFAULT_COVER = "/covers/hushcity.jpg";

export type CoverPreviewSource = "open_graph" | "twitter_card" | "apple_touch_icon" | "favicon";

export interface CoverPreview {
  imageUrl: string;
  pageUrl: string;
  source: CoverPreviewSource;
}

export function isDefaultCover(url?: string | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return true;
  if (trimmed === DEFAULT_COVER) return true;
  try {
    const parsed = new URL(trimmed, "https://idea.local");
    return parsed.pathname === "/covers/hushcity.jpg" || parsed.pathname.endsWith("/covers/hushcity.jpg");
  } catch {
    return trimmed.endsWith("/covers/hushcity.jpg");
  }
}

export function siteMarkUrl(externalUrl: string) {
  try {
    const host = new URL(externalUrl).hostname.trim();
    if (!host) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`;
  } catch {
    return null;
  }
}

export function isSiteMarkUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.includes("/s2/favicons") ||
    lower.includes("icons.duckduckgo.com") ||
    /(?:^|\/)(?:favicon|apple-touch-icon|icon)(?:[./?#]|$)/.test(lower) ||
    /\.ico(?:\?|$)/.test(lower)
  );
}

export function displayCoverUrl(coverUrl?: string, externalUrl?: string) {
  if (!isDefaultCover(coverUrl) && coverUrl) return coverUrl;
  if (externalUrl) return siteMarkUrl(externalUrl) || coverUrl || DEFAULT_COVER;
  return coverUrl || DEFAULT_COVER;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function attributes(tag: string) {
  const result = new Map<string, string>();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    result.set(match[1].toLowerCase(), decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return result;
}

function relTokens(rel: string) {
  return rel.toLowerCase().split(/\s+/).filter(Boolean);
}

function resolveCandidate(raw: string, pageUrl: string) {
  try {
    const imageUrl = new URL(raw, pageUrl);
    if (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") return null;
    if (isDefaultCover(imageUrl.toString())) return null;
    return imageUrl.toString();
  } catch {
    return null;
  }
}

export function extractPreviewImages(html: string, pageUrl: string): CoverPreview[] {
  const openGraphImages: string[] = [];
  const twitterImages: string[] = [];
  const appleTouchIcons: string[] = [];
  const favicons: string[] = [];

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content")?.trim();
    if (!content) continue;
    if (key === "og:image" || key === "og:image:url" || key === "og:image:secure_url") {
      openGraphImages.push(content);
    } else if (key === "twitter:image" || key === "twitter:image:src") {
      twitterImages.push(content);
    }
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const href = attrs.get("href")?.trim();
    if (!href) continue;
    const tokens = relTokens(attrs.get("rel") ?? "");
    if (tokens.includes("apple-touch-icon") || tokens.includes("apple-touch-icon-precomposed")) {
      appleTouchIcons.push(href);
    } else if (tokens.includes("icon") || tokens.includes("shortcut")) {
      favicons.push(href);
    }
  }

  const candidates: Array<{ imageUrl: string; source: CoverPreviewSource }> = [
    ...openGraphImages.map((imageUrl) => ({ imageUrl, source: "open_graph" as const })),
    ...twitterImages.map((imageUrl) => ({ imageUrl, source: "twitter_card" as const })),
    ...appleTouchIcons.map((imageUrl) => ({ imageUrl, source: "apple_touch_icon" as const })),
    ...favicons.map((imageUrl) => ({ imageUrl, source: "favicon" as const })),
  ];
  const resolved: CoverPreview[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const imageUrl = resolveCandidate(candidate.imageUrl, pageUrl);
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    resolved.push({ imageUrl, pageUrl, source: candidate.source });
  }
  return resolved;
}

export function extractPreviewImage(html: string, pageUrl: string): CoverPreview | null {
  return extractPreviewImages(html, pageUrl)[0] ?? null;
}
