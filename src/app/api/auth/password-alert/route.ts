import { NextResponse } from "next/server";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";
import { sendPasswordChangedAlert } from "@/lib/emailService";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  // Enforce rate limiting
  const limited = enforceRateLimit(req, "password-alert");
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid email format", 400);
    }

    const { email } = parsed.data;
    const result = await sendPasswordChangedAlert(email, new Date());

    return jsonOk({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to send password changed alert", 500);
  }
}
