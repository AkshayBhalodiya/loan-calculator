import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { OrganizationModel } from "@/lib/organization-model";
import { UserModel } from "@/lib/user-model";
import { auth } from "@/lib/auth";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "org-create");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return jsonError("Sign in required.", 401);
    }
    const email = session.user.email;

    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return jsonError("Organization name is required.", 400);
    }

    await connectMongo();

    // Check if user is already in an organization
    const dbUser = await UserModel.findOne({ email });
    if (!dbUser) {
      return jsonError("User not found.", 404);
    }
    if (dbUser.orgId) {
      return jsonError("You are already in an organization. Leave first.", 400);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let exists = await OrganizationModel.findOne({ inviteCode });
    while (exists) {
      inviteCode = generateInviteCode();
      exists = await OrganizationModel.findOne({ inviteCode });
    }

    const org = await OrganizationModel.create({
      name: name.trim(),
      inviteCode,
      createdBy: email,
    });

    dbUser.orgId = org._id;
    await dbUser.save();

    return jsonOk({
      message: "Organization created successfully.",
      organization: {
        id: org._id.toString(),
        name: org.name,
        inviteCode: org.inviteCode,
      },
    }, 201);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonError(`Failed to create organization: ${msg}`, 500);
  }
}
