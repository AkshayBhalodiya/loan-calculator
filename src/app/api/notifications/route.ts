import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { NotificationModel } from "@/lib/notification-model";
import { createSpendingLimitNotification } from "@/lib/notification-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
    const limit = typeof body?.limit === "number" ? body.limit : Number(body?.limit);

    if (!userId || !Number.isFinite(amount) || !Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json({ success: false, message: "Invalid notification payload." }, { status: 400 });
    }

    await connectMongo();
    const notification = await createSpendingLimitNotification(userId, { amount, limit });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message ?? "Failed to create notification." }, { status: 500 });
  }
}
