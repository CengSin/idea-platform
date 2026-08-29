import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = new Set(["/login", "/register"]);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("idea_session")?.value);

  if (AUTH_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|covers/).*)"],
};
