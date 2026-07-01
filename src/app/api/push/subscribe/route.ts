import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "push-subscribe");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    const { subscription } = await req.json();

    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      return jsonError("User not found.", 404);
    }

    user.pushSubscription = subscription || null;
    await user.save();

    return jsonOk({
      message: subscription
        ? "Push notifications subscription enabled successfully."
        : "Push notifications subscription disabled successfully.",
      subscribed: !!subscription,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to update subscription: ${msg}`, 500);
  }
}
