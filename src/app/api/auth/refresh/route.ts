import { NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/refresh-tokens";

export async function POST(req: Request) {
  // read cookie
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )refreshToken=([^;]+)/);
  const rawToken = match ? decodeURIComponent(match[1]) : null;
  if (!rawToken) return NextResponse.json({ error: "No refresh token" }, { status: 401 });

  const result = await rotateRefreshToken(rawToken);
  if (result.status === "not_found") {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (result.status === "reused") {
    // clear cookie and inform client that family revoked
    const res = NextResponse.json({ error: "Token reuse detected, family revoked" }, { status: 401 });
    res.cookies.set("refreshToken", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  // rotated
  const res = NextResponse.json({ success: true });
  res.cookies.set("refreshToken", result.newToken ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
