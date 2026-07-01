import { connectMongo } from "@/lib/mongodb";
import { OrganizationModel } from "@/lib/organization-model";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "org-join");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    const { inviteCode } = await req.json();
    if (!inviteCode || typeof inviteCode !== "string" || !inviteCode.trim()) {
      return jsonError("Invite code is required.", 400);
    }

    const code = inviteCode.trim().toUpperCase();

    await connectMongo();

    // Check if organization exists
    const org = await OrganizationModel.findOne({ inviteCode: code });
    if (!org) {
      return jsonError("Invalid invite code. Organization not found.", 404);
    }

    // Check if user is already in an organization
    const dbUser = await UserModel.findOne({ email });
    if (!dbUser) {
      return jsonError("User not found.", 404);
    }
    if (dbUser.orgId) {
      if (dbUser.orgId.toString() === org._id.toString()) {
        return jsonError("You are already a member of this organization.", 400);
      }
      return jsonError("You are already in an organization. Leave first.", 400);
    }

    dbUser.orgId = org._id;
    await dbUser.save();

    return jsonOk({
      message: `Successfully joined ${org.name}.`,
      organization: {
        id: org._id.toString(),
        name: org.name,
        inviteCode: org.inviteCode,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to join organization: ${msg}`, 500);
  }
}
