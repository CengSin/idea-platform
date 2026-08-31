export function authDestination(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  // Auth pages must not redirect to each other after sign-in.
  const pathname = value.split(/[?#]/)[0];
  return pathname === "/login" || pathname === "/register" ? "/" : value;
}
