import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { hashPassword } from "@/lib/password";
import { isReservedAdminEmail } from "@/lib/auth-users";
import { enforceRateLimit, jsonError, jsonOk, mongoErrorMessage } from "@/lib/api-utils";
import { signUpSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "signup");
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid signup data.", 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    if (isReservedAdminEmail(email)) {
      return jsonError("This email is reserved. Use a different email to sign up.", 400);
    }

    await connectMongo();
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return jsonError("An account with this email already exists. Please sign in.", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await UserModel.create({
      email,
      passwordHash,
      name: parsed.data.name?.trim() || email.split("@")[0],
      role: "user",
    });

    return jsonOk(
      {
        userId: user._id.toString(),
        email: user.email,
        message: "Account created. You can sign in now.",
      },
      201
    );
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Sign up failed"), 500);
  }
}
