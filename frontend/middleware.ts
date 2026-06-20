import { NextResponse, type NextRequest } from "next/server";

const publicPrefixes = [
  "/",
  "/about-us",
  "/login",
  "/pricing",
  "/register",
  "/reading-analyzer/shared",
  "/shared"
];

const protectedPrefixes = [
  "/curriculum",
  "/dashboard",
  "/diagnostic",
  "/mock-test",
  "/my-1400",
  "/path",
  "/payment",
  "/practice",
  "/reading-analyzer",
  "/reading-path",
  "/results",
  "/roadmap",
  "/sat-mock",
  "/sat-test",
  "/test"
];

function startsWithPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtectedPath(pathname: string) {
  if (publicPrefixes.some((prefix) => startsWithPrefix(pathname, prefix) && prefix !== "/")) {
    return false;
  }
  return protectedPrefixes.some((prefix) => startsWithPrefix(pathname, prefix));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sat1600_token")?.value;
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|assets).*)"]
};
