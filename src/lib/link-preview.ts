import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  DEFAULT_COVER,
  extractPreviewImages,
  isPlaceholderCover,
  type CoverPreview as LinkPreview,
} from "./cover";

export type { LinkPreview };

const MAX_HTML_BYTES = 1_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1_000;
const FAILED_CACHE_TTL_MS = 5 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 200;
const PREVIEW_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 IdeaPlatform-LinkPreview/1.0";

interface CacheEntry {
  expiresAt: number;
  preview: LinkPreview | null;
}

const cache = new Map<string, CacheEntry>();

export { extractPreviewImage, extractPreviewImages } from "./cover";

function isPrivateIPv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export function isPrivateAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPrivateAddress(normalized.slice("::ffff:".length));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

async function assertPublicHttpUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported_protocol");
  }
  if (url.username || url.password) throw new Error("url_credentials_not_allowed");
  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("private_host_not_allowed");
  }
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("private_address_not_allowed");
    return;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error("private_address_not_allowed");
  }
}

async function readHtml(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_HTML_BYTES) throw new Error("page_too_large");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) throw new Error("page_too_large");
      html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function fetchHtml(inputUrl: string) {
  let current = new URL(inputUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicHttpUrl(current);
    const response = await fetch(current, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": PREVIEW_UA,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("too_many_redirects");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`preview_http_${response.status}`);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("not_html");
    }
    return { html: await readHtml(response), pageUrl: current.toString() };
  }
  throw new Error("too_many_redirects");
}

function remember(url: string, preview: LinkPreview | null) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(url, {
    expiresAt: Date.now() + (preview ? CACHE_TTL_MS : FAILED_CACHE_TTL_MS),
    preview,
  });
}

export async function resolveLinkPreview(inputUrl: string): Promise<LinkPreview | null> {
  let normalizedUrl: string;
  try {
    const url = new URL(inputUrl.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    normalizedUrl = url.toString();
  } catch {
    return null;
  }

  const cached = cache.get(normalizedUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.preview;
  if (cached) cache.delete(normalizedUrl);

  try {
    const page = await fetchHtml(normalizedUrl);
    for (const preview of extractPreviewImages(page.html, page.pageUrl)) {
      try {
        await assertPublicHttpUrl(new URL(preview.imageUrl));
        remember(normalizedUrl, preview);
        return preview;
      } catch {
        // Try the next public candidate (favicon / apple-touch-icon).
      }
    }
    remember(normalizedUrl, null);
    return null;
  } catch {
    remember(normalizedUrl, null);
    return null;
  }
}

export async function resolveWorkCover(work: { coverUrl?: string; externalUrl?: string }) {
  if (!isPlaceholderCover(work.coverUrl) && work.coverUrl) return work.coverUrl;
  if (!work.externalUrl) return work.coverUrl || DEFAULT_COVER;
  const preview = await resolveLinkPreview(work.externalUrl);
  return preview?.imageUrl || DEFAULT_COVER;
}
