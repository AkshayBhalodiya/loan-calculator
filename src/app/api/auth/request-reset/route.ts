import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { z } from "zod";
import { sendResetEmail } from "@/lib/emailService";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

    const { email } = parsed.data;

    // create a short-lived JWT reset token (1 hour)
    const maxAge = 60 * 60; // seconds
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    const token = await encode({
      token: { sub: email, type: "reset" },
      secret: process.env.AUTH_SECRET,
      maxAge,
    } as any);

    if (!token) throw new Error("Failed to create token");

    // send email with expiry time
    await sendResetEmail(email, token, expiresAt);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
