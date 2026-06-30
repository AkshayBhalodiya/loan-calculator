"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthField from "@/components/auth/auth-field";
import AuthShell from "@/components/auth/auth-shell";
import { z } from "zod";

const step1Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

const step2Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional().refine((val) => !val || /^\d{10}$/.test(val), {
    message: "Phone number must be exactly 10 digits",
  }),
});

const step3Schema = z.object({
  currency: z.enum(["INR", "USD", "EUR"]),
  frequency: z.enum(["Instant", "Weekly", "Monthly", "Off"]),
});

export default function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Step 2 states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 states
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR">("INR");
  const [frequency, setFrequency] = useState<"Instant" | "Weekly" | "Monthly" | "Off">("Monthly");

  // API submission states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function nextStep() {
    if (step === 1) {
      const res = step1Schema.safeParse({ email, password, confirm });
      if (!res.success) {
        const errMap: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          errMap[path] = issue.message;
        });
        setErrors(errMap);
        return;
      }
    } else if (step === 2) {
      const res = step2Schema.safeParse({ name, phone });
      if (!res.success) {
        const errMap: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          errMap[path] = issue.message;
        });
        setErrors(errMap);
        return;
      }
    }
    setErrors({});
    setStep((s) => s + 1);
  }

  function prevStep() {
    setErrors({});
    setStep((s) => s - 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const res = step3Schema.safeParse({ currency, frequency });
    if (!res.success) {
      const errMap: Record<string, string> = {};
      res.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errMap[path] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
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
      <span className="lw-auth-badge">Step {step} of 3</span>
      <h1 className="lw-auth-heading">Create account</h1>
      <p className="lw-auth-subheading">
        Sign up in seconds and start saving your loan strategy reports.
      </p>

      {/* Progress Bar Indicator */}
      <div className="mt-6 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                step === s
                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20"
                  : step > s
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}
            >
              {step > s ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </div>
            <span
              className={`text-xs font-semibold ${
                step === s
                  ? "text-indigo-600 dark:text-indigo-400"
                  : step > s
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {s === 1 ? "Account" : s === 2 ? "Profile" : "Preferences"}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <AuthField
                id="signup-email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(val) => {
                  setEmail(val);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
              />
              {errors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email}</p>}
            </div>

            <div>
              <AuthField
                id="signup-password"
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(val) => {
                  setPassword(val);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
              />
              {errors.password && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.password}</p>}
            </div>

            <div>
              <AuthField
                id="signup-confirm"
                label="Confirm password"
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(val) => {
                  setConfirm(val);
                  if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: "" }));
                }}
              />
              {errors.confirm && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.confirm}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <AuthField
                id="signup-name"
                label="Full name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(val) => {
                  setName(val);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name}</p>}
            </div>

            <div>
              <AuthField
                id="signup-phone"
                label="Phone number (optional)"
                placeholder="10-digit number"
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
              />
              {errors.phone && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone}</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="lw-auth-field">
              <label htmlFor="signup-currency" className="lw-auth-label">
                Default Currency
              </label>
              <select
                id="signup-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="lw-auth-input mt-1 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <div className="lw-auth-field">
              <label htmlFor="signup-frequency" className="lw-auth-label">
                Prepayment Strategy Updates
              </label>
              <select
                id="signup-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="lw-auth-input mt-1 w-full rounded-md border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="Instant">Instant alerts</option>
                <option value="Weekly">Weekly Digest</option>
                <option value="Monthly">Monthly Digest</option>
                <option value="Off">Do not send updates</option>
              </select>
            </div>
          </div>
        )}

        {error ? (
          <p className="text-sm text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-3 font-medium" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 font-medium" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              disabled={loading || !!success}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          )}
        </div>
      </form>

      <div className="lw-auth-divider">Already registered?</div>

      <p className="lw-auth-footer">
        Have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
