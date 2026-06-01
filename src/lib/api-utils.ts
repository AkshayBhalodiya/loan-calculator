import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export async function getSession() {
  return auth();
}

export async function getSessionUserId() {
  const session = await auth();
  const email = session?.user?.email;
  return email ?? null;
}

export async function getSessionRole() {
  const session = await auth();
  return session?.user?.role ?? null;
}

export async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) return { userId: null, error: jsonError("Sign in required.", 401) as Response };
  return { userId, error: null };
}

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { session: null, error: jsonError("Admin access only.", 403) as Response };
  }
  return { session, error: null };
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "local";
}

export function enforceRateLimit(req: Request, bucket: string) {
  const ip = getClientIp(req);
  const result = checkRateLimit(`${bucket}:${ip}`);
  if (!result.ok) {
    return jsonError(`Too many requests. Retry in ${result.retryAfterSec}s.`, 429);
  }
  return null;
}

export function mongoErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("MONGODB_URI")) {
    return "MONGODB_URI missing. Add it in .env.local.";
  }
  return `${fallback}: ${message}`;
}
