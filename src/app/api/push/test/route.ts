import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { getVapidKeys } from "@/lib/vapid";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";
import webpush from "web-push";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "push-test");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    await connectMongo();
    const user = await UserModel.findOne({ email });
    if (!user) {
      return jsonError("User not found.", 404);
    }

    if (!user.pushSubscription) {
      return jsonError("You are not subscribed to push notifications.", 400);
    }

    const keys = getVapidKeys();
    
    // Set VAPID details
    webpush.setVapidDetails(
      "mailto:support@loanwise.dev",
      keys.publicKey,
      keys.privateKey
    );

    // Payload for push notification
    const payload = JSON.stringify({
      title: "LoanWise Prepayment Alert",
      body: "Hurrah! Your push notifications end-to-end flow is working perfectly! 🚀",
      icon: "/file.svg",
      data: {
        url: "/dashboard"
      }
    });

    // Send push notification
    await webpush.sendNotification(user.pushSubscription, payload);

    return jsonOk({
      message: "Test push notification sent successfully.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to send push notification: ${msg}`, 500);
  }
}
