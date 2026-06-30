export function authorizeAdminToken(token: any) {
  if (!token) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (token.role !== "admin") {
    return { ok: false, status: 403, message: "Forbidden: admin role required" };
  }

  return { ok: true };
}
