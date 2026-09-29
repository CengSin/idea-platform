export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(req.url).protocol.slice(0, -1);
  try {
    return origin === new URL(`${protocol}://${host || new URL(req.url).host}`).origin;
  } catch {
    return false;
  }
}
