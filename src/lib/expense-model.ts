import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "INR" },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

export const ExpenseModel =
  mongoose.models.Expense || mongoose.model("Expense", expenseSchema, "expenses");
