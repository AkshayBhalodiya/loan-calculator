import { connectMongo } from "@/lib/mongodb";
import { NotificationModel } from "@/lib/notification-model";

export async function notifyMissedTransactions(userId: string, missed: Array<any>) {
  // Attempt to send email via Resend if configured, otherwise just return summary
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const to = process.env.SYSTEM_ADMIN_EMAIL ?? null; // fallback: send to admin for demo

  const summary = missed
    .map((m) => `• ${m.description || "(no description)"} — ${m.amount} ${m.currency} due ${new Date(m.dueDate).toLocaleDateString()}`)
    .join("\n");

  const subject = `Missed recurring transactions for user ${userId}`;
  const html = `<p>The following recurring transactions were marked as <strong>missed</strong> for user ${userId}:</p><pre>${summary}</pre>`;

  if (!apiKey || !to) {
    // No email configured; just log and return the summary
    console.log("notifyMissedTransactions: no email configured, summary:", { userId, missed });
    return { emailed: false, summary };
  }

  await connectMongo();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("notifyMissedTransactions: email send failed", text);
    return { emailed: false, error: text };
  }

  return { emailed: true, summary };
}

export async function createSpendingLimitNotification(userId: string, payload: { amount: number; limit: number }) {
  await connectMongo();

  const title = "Spending limit exceeded";
  const message = `Transaction amount ${payload.amount} exceeded your single-transaction limit of ${payload.limit}.`;

  const notification = await NotificationModel.create({
    userId,
    type: "spending-limit-exceeded",
    title,
    message,
    metadata: { amount: payload.amount, limit: payload.limit },
  });

  return notification.toObject ? notification.toObject() : notification;
}
