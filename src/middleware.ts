import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { authorizeAdminToken } from "@/lib/authorize-admin";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const result = checkRateLimit(`api:${ip}`, 120, 60_000);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        message: `Too many requests. Retry in ${result.retryAfterSec}s.`,
      },
      { status: 429 }
    );
  }

  // Role-based access control for admin routes
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const token = await getToken({ req: request as any, secret: process.env.AUTH_SECRET });
    const auth = authorizeAdminToken(token);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
