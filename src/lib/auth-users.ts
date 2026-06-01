import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { verifyPassword } from "@/lib/password";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

function getAdminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  return email && password ? { email, password } : null;
}

export function isReservedAdminEmail(email: string) {
  const admin = getAdminConfig();
  return admin ? email.toLowerCase() === admin.email : false;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const admin = getAdminConfig();
  if (admin && normalized === admin.email && password === admin.password) {
    return {
      id: `admin:${normalized}`,
      email: normalized,
      name: "Admin",
      role: "admin",
    };
  }

  await connectMongo();
  const user = await UserModel.findOne({ email: normalized });
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name || user.email.split("@")[0],
    role: "user",
  };
}
