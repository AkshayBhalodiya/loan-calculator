import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["missed-recurring", "spending-limit-exceeded"],
      default: "missed-recurring",
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema, "notifications");
