// 站点对外地址：canonical、分享卡片 og:url / og:image 都以它为基准。
// NEXT_PUBLIC_SITE_URL 必须是 http(s) 绝对地址；配错（比如存成了密文字符串）时退回自有域名，
// 不退回 *.vercel.app（国内常打不开）。
export const DEFAULT_SITE_URL = "https://idea-platform.z-agent.ccwu.cc";

export function resolveSiteUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    if (url.hostname.endsWith(".vercel.app")) return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function siteUrl(): string {
  return resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}
