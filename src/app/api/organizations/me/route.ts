import { connectMongo } from "@/lib/mongodb";
import { OrganizationModel } from "@/lib/organization-model";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "org-me-get");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    await connectMongo();

    const dbUser = await UserModel.findOne({ email }).lean();
    if (!dbUser) {
      return jsonError("User not found.", 404);
    }

    if (!dbUser.orgId) {
      return jsonOk({ organization: null, members: [] });
    }

    const org = await OrganizationModel.findById(dbUser.orgId).lean();
    if (!org) {
      // Clean up orphaned orgId
      await UserModel.updateOne({ email }, { $set: { orgId: null } });
      return jsonOk({ organization: null, members: [] });
    }

    const members = await UserModel.find({ orgId: org._id }, "name email role")
      .sort({ name: 1 })
      .lean();

    return jsonOk({
      organization: {
        id: org._id.toString(),
        name: org.name,
        inviteCode: org.inviteCode,
        createdBy: org.createdBy,
      },
      members: members.map((m) => ({
        id: m._id.toString(),
        name: m.name || m.email.split("@")[0],
        email: m.email,
        role: m.role,
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to fetch organization: ${msg}`, 500);
  }
}
