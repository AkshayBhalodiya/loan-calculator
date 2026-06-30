import { connectMongo } from "@/lib/mongodb";
import mongoose from "mongoose";

const householdMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    balance: { type: Number, default: 0 },
  },
  { _id: true }
);

const householdSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    members: [householdMemberSchema],
  },
  { timestamps: true }
);

export const HouseholdModel =
  mongoose.models.Household || mongoose.model("Household", householdSchema, "households");

export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: number;
}

export async function getSettlementSuggestions(householdId: string): Promise<SettlementSuggestion[]> {
  await connectMongo();

  const household = await HouseholdModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(householdId) } },
    {
      $project: {
        members: {
          $map: {
            input: "$members",
            as: "member",
            in: {
              _id: "$${member._id}",
              name: "$${member.name}",
              balance: { $ifNull: ["$$member.balance", 0] },
            },
          },
        },
      },
    },
    { $unwind: "$members" },
    {
      $group: {
        _id: "$members._id",
        name: { $first: "$members.name" },
        netBalance: { $sum: "$members.balance" },
      },
    },
  ]);

  if (!household || household.length === 0) {
    return [];
  }

  const balances = household.map((entry: any) => ({
    memberId: entry._id.toString(),
    name: entry.name,
    balance: Number(entry.netBalance ?? 0),
  }));

  const positive = balances.filter((entry) => entry.balance > 0);
  const negative = balances.filter((entry) => entry.balance < 0);
  const suggestions: SettlementSuggestion[] = [];

  while (positive.length > 0 && negative.length > 0) {
    const creditor = positive[0];
    const debtor = negative[0];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    if (amount > 0) {
      suggestions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Number(amount.toFixed(2)),
      });

      creditor.balance -= amount;
      debtor.balance += amount;
    }

    if (creditor.balance <= 0.0001) positive.shift();
    if (debtor.balance >= -0.0001) negative.shift();
  }

  return suggestions;
}
