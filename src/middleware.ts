import { NextResponse, type NextRequest } from "next/server";

function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isAsset(pathname)) return NextResponse.next();

  const demoApp = process.env.NEXT_PUBLIC_ATRIUM_APP === "demo";
  const demoPath = pathname === "/demo" || pathname.startsWith("/demo/");

  if (demoApp) {
    if (demoPath) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/demo";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (demoPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
