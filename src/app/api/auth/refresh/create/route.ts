import { NextResponse } from "next/server";
import { createRefreshToken } from "@/lib/refresh-tokens";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  // create a refresh token for the currently-signed-in user
  const session = await getServerSession(auth as any);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = (session as any).sub ?? session.user?.email;
  const { token } = await createRefreshToken(userId.toString());

  const res = NextResponse.json({ success: true });
  // set httpOnly cookie
  res.cookies.set("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
