import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { authenticateUser } from "@/lib/auth-users";
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString() ?? "";
        const password = credentials?.password?.toString() ?? "";
        const user = await authenticateUser(email, password);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        const role = (user as { role?: "user" | "admin" }).role;
        token.role = role === "admin" ? "admin" : "user";
        token.sub = user.id;
      }
      if (token.email) {
        try {
          await connectMongo();
          const dbUser = await UserModel.findOne({ email: token.email }).lean();
          if (dbUser) {
            token.orgId = dbUser.orgId?.toString() ?? null;
          } else {
            token.orgId = null;
          }
        } catch (err) {
          console.error("Error fetching orgId in jwt callback:", err);
          token.orgId = null;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.role = (token.role as "user" | "admin") ?? "user";
        session.user.orgId = token.orgId as string | null;
      }
      return session;
    },
  },
});
