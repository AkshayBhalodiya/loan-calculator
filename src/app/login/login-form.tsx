"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthField from "@/components/auth/auth-field";
import AuthShell from "@/components/auth/auth-shell";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }
      // create a refresh token cookie (server will use current session)
      try {
        await fetch("/api/auth/refresh/create", { method: "POST" });
      } catch (e) {
        // ignore — refresh tokens are best-effort
      }
      window.location.href = callbackUrl.startsWith("/") ? callbackUrl : "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="login">
      <span className="lw-auth-badge">Member access</span>
      <h1 className="lw-auth-heading">Sign in</h1>
      <p className="lw-auth-subheading">
        Enter your credentials to access your dashboard and saved reports.
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          className="lw-auth-btn"
          onClick={() => signIn("google", { callbackUrl: callbackUrl.startsWith("/") ? callbackUrl : "/" })}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="lw-auth-btn"
          onClick={() => signIn("github", { callbackUrl: callbackUrl.startsWith("/") ? callbackUrl : "/" })}
        >
          Continue with GitHub
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <AuthField
          id="login-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="login-password"
          label="Password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        {error ? (
          <p className="lw-auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="lw-auth-btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="lw-auth-divider">New to LoanWise?</div>

      <p className="lw-auth-footer">
        Don&apos;t have an account?{" "}
        <Link href="/signup">Create a free account</Link>
      </p>
    </AuthShell>
  );
}
