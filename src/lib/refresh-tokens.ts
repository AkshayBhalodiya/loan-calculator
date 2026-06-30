import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import { RefreshTokenModel } from "./refresh-token-model";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(userId: string, family?: string) {
  await connectMongo();
  const raw = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(raw);
  const familyId = family ?? crypto.randomBytes(16).toString("hex");

  const doc = await RefreshTokenModel.create({
    userId,
    tokenHash,
    family: familyId,
    revoked: false,
  });

  return { token: raw, doc };
}

export async function rotateRefreshToken(rawToken: string) {
  await connectMongo();
  const tokenHash = hashToken(rawToken);
  const token = await RefreshTokenModel.findOne({ tokenHash });
  if (!token) {
    // token not found — caller can treat as invalid/reuse
    return { status: "not_found" };
  }

  if (token.revoked) {
    // reuse detected: revoke whole family
    await RefreshTokenModel.updateMany({ family: token.family }, { revoked: true, revokedAt: new Date() });
    return { status: "reused", family: token.family };
  }

  // valid: rotate
  const { token: newRaw, doc: newDoc } = await createRefreshToken(token.userId, token.family);
  token.revoked = true;
  token.revokedAt = new Date();
  token.replacedBy = newDoc._id;
  token.lastUsedAt = new Date();
  await token.save();

  return { status: "rotated", newToken: newRaw, family: token.family };
}

export async function revokeFamily(familyId: string) {
  await connectMongo();
  await RefreshTokenModel.updateMany({ family: familyId }, { revoked: true, revokedAt: new Date() });
}
