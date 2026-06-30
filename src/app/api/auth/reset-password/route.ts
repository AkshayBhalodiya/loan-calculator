import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { hashPassword } from "@/lib/password";

const bodySchema = z.object({ token: z.string(), password: z.string().min(6) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { token, password } = parsed.data;

    const decoded = await decode({ token, secret: process.env.AUTH_SECRET } as any);
    if (!decoded || (decoded as any).type !== "reset") {
      return NextResponse.json({ error: "Invalid or malformed reset token" }, { status: 400 });
    }

    // explicit expiry validation
    const exp = (decoded as any).exp; // in seconds since epoch
    if (!exp) return NextResponse.json({ error: "Token has no expiry" }, { status: 400 });

    const expMs = exp * 1000;
    if (Date.now() > expMs) {
      const when = new Date(expMs).toLocaleString();
      return NextResponse.json({ error: `Reset token expired on ${when}` }, { status: 400 });
    }

    const email = (decoded as any).sub as string | undefined;
    if (!email) return NextResponse.json({ error: "Token missing subject" }, { status: 400 });

    await connectMongo();
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    user.passwordHash = await hashPassword(password);
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
