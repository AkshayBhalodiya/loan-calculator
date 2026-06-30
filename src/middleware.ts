import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getToken } from "next-auth/jwt";
import { authorizeAdminToken } from "@/lib/authorize-admin";

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const result = checkRateLimit(`api:${ip}`, 120, 60_000);
  if (!result.ok) {
    const res = NextResponse.json(
      {
        success: false,
        message: `Too many requests. Retry in ${result.retryAfterSec}s.`,
      },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(result.retryAfterSec));
    return res;
  }

  // Role-based access control for admin routes
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const token = await getToken({ req: request as any, secret: process.env.AUTH_SECRET });
    const auth = authorizeAdminToken(token);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
  }

  // Endpoint-specific stricter rate limit for admin users listing
  if (request.nextUrl.pathname === "/api/admin/users") {
    const adminLimit = checkRateLimit(`admin:users:${ip}`, 10, 15_000); // 10 req per 15s
    if (!adminLimit.ok) {
      const res = NextResponse.json({ success: false, message: `Too many requests. Retry in ${adminLimit.retryAfterSec}s.` }, { status: 429 });
      res.headers.set("Retry-After", String(adminLimit.retryAfterSec));
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
