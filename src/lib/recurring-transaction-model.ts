import mongoose, { Schema } from "mongoose";

const recurringTransactionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    description: { type: String, default: "", maxlength: 500 },
    processed: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["scheduled", "processed", "missed"], default: "scheduled", index: true },
    missedAt: { type: Date },
  },
  { timestamps: true }
);

export const RecurringTransactionModel =
  mongoose.models.RecurringTransaction ||
  mongoose.model("RecurringTransaction", recurringTransactionSchema, "recurring_transactions");
