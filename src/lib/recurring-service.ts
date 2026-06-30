import { connectMongo } from "@/lib/mongodb";
import { RecurringTransactionModel } from "@/lib/recurring-transaction-model";
import { notifyMissedTransactions } from "@/lib/notification-service";

export async function markMissedRecurringTransactions() {
  await connectMongo();

  const now = new Date();
  // find recurring transactions that are past due, not processed and still scheduled
  const missed = await RecurringTransactionModel.find({
    dueDate: { $lt: now },
    processed: false,
    status: "scheduled",
  }).lean();

  if (!missed || missed.length === 0) {
    return { processed: 0 };
  }

  // group by userId
  const byUser: Record<string, any[]> = {};
  for (const m of missed) {
    byUser[m.userId] = byUser[m.userId] || [];
    byUser[m.userId].push(m);
  }

  let totalMarked = 0;
  const notifications: Record<string, any> = {};

  // mark each as missed and record missedAt
  for (const userId of Object.keys(byUser)) {
    const list = byUser[userId];
    const ids = list.map((l) => l._id);
    const res = await RecurringTransactionModel.updateMany({ _id: { $in: ids } }, { $set: { status: "missed", missedAt: new Date() } });
    totalMarked += (res.modifiedCount ?? res.nModified ?? 0);

    // trigger notification for this user
    try {
      const notifyRes = await notifyMissedTransactions(userId, list);
      notifications[userId] = notifyRes;
    } catch (err: any) {
      notifications[userId] = { error: err?.message ?? String(err) };
    }
  }

  return { processed: totalMarked, notifications };
}
