import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Landing page (/) tetap publik. Hanya /dashboard yang butuh sesi klinis.
export const config = {
  matcher: ["/dashboard/:path*"],
};

export default async function proxy(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
