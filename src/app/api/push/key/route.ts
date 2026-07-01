import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/vapid";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "push-key");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }

    const keys = getVapidKeys();
    return jsonOk({ publicKey: keys.publicKey });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to fetch VAPID key: ${msg}`, 500);
  }
}
