import "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      role?: "user" | "admin" | "moderator";
    };
  }

  interface User {
    role?: "user" | "admin" | "moderator";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: "user" | "admin" | "moderator";
  }
}
