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
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  },
  { timestamps: true }
);

export const ReportModel =
  mongoose.models.Report || mongoose.model("Report", reportSchema, "reports");

/** Logged-in user sees only their reports or their organization's reports. */
export function reportOwnerFilter(userId: string, orgId?: string | null) {
  if (orgId) {
    return { orgId };
  }
  return { userId };
}
