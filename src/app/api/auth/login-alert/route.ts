import { NextResponse } from "next/server";
import { jsonError, jsonOk, enforceRateLimit } from "@/lib/api-utils";
import { sendNewDeviceLoginAlert } from "@/lib/emailService";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "login-alert");
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email, device, ip, location } = body ?? {};
    if (!email || !device || !ip) {
      return jsonError("Missing required fields: email, device, ip.", 400);
    }

    const notification = await sendNewDeviceLoginAlert(
      email,
      device,
      ip,
      new Date(),
      location
    );

    return jsonOk({ notification });
  } catch (error: any) {
    return jsonError(error?.message ?? "Failed to send login alert", 500);
  }
}
