"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthField from "@/components/auth/auth-field";
import AuthShell from "@/components/auth/auth-shell";

export default function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirm) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Sign up failed. Please try again.");
        return;
      }
      setSuccess("Account created! Redirecting you to sign in…");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="signup">
      <span className="lw-auth-badge">Free account</span>
      <h1 className="lw-auth-heading">Create account</h1>
      <p className="lw-auth-subheading">
        Sign up in seconds and start saving your loan strategy reports.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <AuthField
          id="signup-name"
          label="Full name"
          placeholder="Optional"
          autoComplete="name"
          value={name}
          onChange={setName}
          hint="Optional — shown on your dashboard"
        />
        <AuthField
          id="signup-email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <AuthField
          id="signup-confirm"
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />

        {error ? (
          <p className="lw-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="lw-auth-success" role="status">
            {success}
          </p>
        ) : null}

        <button type="submit" className="lw-auth-btn" disabled={loading || !!success}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="lw-auth-divider">Already registered?</div>

      <p className="lw-auth-footer">
        Have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
