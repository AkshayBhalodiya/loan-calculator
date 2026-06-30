import { NextResponse } from "next/server";

export async function GET() {
  // placeholder admin-protected endpoint returning a short user list
  const users = [
    { id: "1", email: "alice@example.com", role: "user" },
    { id: "2", email: "bob@example.com", role: "moderator" },
  ];

  return NextResponse.json({ success: true, users });
}
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { ReportModel } from "@/lib/report-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk, mongoErrorMessage } from "@/lib/api-utils";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "admin-users");
  if (limited) return limited;

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return jsonError("Admin access only.", 403);
  }

  try {
    await connectMongo();
    const users = await UserModel.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    const reportCounts = await ReportModel.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      reportCounts.map((row) => [row._id as string, row.count as number])
    );

    const list = users.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      reportCount: countMap.get(u.email) ?? 0,
    }));

    return jsonOk({ users: list, total: list.length });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to load users"), 500);
  }
}
