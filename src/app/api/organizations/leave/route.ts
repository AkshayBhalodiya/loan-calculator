import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "org-leave");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    await connectMongo();

    const dbUser = await UserModel.findOne({ email });
    if (!dbUser) {
      return jsonError("User not found.", 404);
    }

    if (!dbUser.orgId) {
      return jsonError("You are not currently in any organization.", 400);
    }

    dbUser.orgId = null;
    await dbUser.save();

    return jsonOk({
      message: "Successfully left the organization.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to leave organization: ${msg}`, 500);
  }
}
