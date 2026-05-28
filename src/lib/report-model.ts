import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    loan: { type: Object, required: true },
    strategy: { type: Object, required: true },
    summary: { type: Object, required: true },
  },
  { timestamps: true }
);

export const ReportModel =
  mongoose.models.Report || mongoose.model("Report", reportSchema, "reports");
