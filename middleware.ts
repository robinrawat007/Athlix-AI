import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes are open — mobile app and n8n hit these directly
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Login page is always accessible
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const auth = req.cookies.get("auth")?.value;
  if (auth !== process.env.DASHBOARD_PASSWORD) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
