import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },
    role: { type: String, enum: ["user", "moderator"], default: "user" },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema, "users");
