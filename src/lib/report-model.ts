import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    userId: { type: String, index: true, default: null },
    title: { type: String, default: "" },
    notes: { type: String, default: "" },
    loan: { type: Object, required: true },
    strategy: { type: Object, required: true },
    summary: { type: Object, required: true },
    chartData: { type: Object, default: null },
  },
  { timestamps: true }
);

export const ReportModel =
  mongoose.models.Report || mongoose.model("Report", reportSchema, "reports");

/** Logged-in user sees only their reports (matched by email). */
export function reportOwnerFilter(userId: string) {
  return { userId };
}
