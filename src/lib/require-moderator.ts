import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function requireModerator(req: Request) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (token.role !== "moderator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return token;
}
