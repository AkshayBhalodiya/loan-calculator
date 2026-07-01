import mongoose, { Schema } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    inviteCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const OrganizationModel =
  mongoose.models.Organization || mongoose.model("Organization", organizationSchema, "organizations");
