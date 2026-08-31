import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("idea_session")?.value);

  if (AUTH_PATHS.has(pathname) || pathname === "/explore" || pathname.startsWith("/explore/")) {
    return NextResponse.next();
  }

  if (!hasSession) {
    if (pathname === "/") return NextResponse.redirect(new URL("/explore", request.url));
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|icon.svg|apple-icon|covers/).*)"],
};
