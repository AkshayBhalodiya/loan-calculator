import mongoose, { Schema } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    family: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    replacedBy: { type: Schema.Types.ObjectId, ref: "RefreshToken", default: null },
    createdAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { timestamps: false }
);

export const RefreshTokenModel =
  mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokenSchema, "refresh_tokens");
