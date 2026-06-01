"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INR } from "@/lib/loan";
import { UI } from "@/lib/ui-classes";

type Stats = {
  totalReports: number;
  highRiskCount: number;
  totalInterestSaved: number;
  avgMonthsSaved: number;
  maxInterestSaved: number;
  scope: string;
  byLoanType: { _id: string; count: number }[];
};

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.message || "Failed to load stats.");
          return;
        }
        setStats(data);
      })
      .catch(() => setError("Failed to load stats."));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <section className={UI.hero}>
        <h1 className={UI.titleHero}>Dashboard</h1>
        <p className={UI.subtitle}>Your saved loan reports at a glance.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className={UI.btnHero}>
            Calculator
          </Link>
          <Link href="/reports" className={UI.btnPrimary}>
            Reports
          </Link>
        </div>
      </section>

      {error ? (
        <p className="lw-alert-warning rounded-md p-4">
          {error}
        </p>
      ) : null}

      {!stats && !error ? <p className="lw-muted">Loading stats...</p> : null}

      {stats ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={UI.statCard}>
              <p className="lw-muted text-sm">Total reports</p>
              <p className="text-2xl font-bold">{stats.totalReports}</p>
            </div>
            <div className={UI.statCard}>
              <p className="lw-muted text-sm">High risk</p>
              <p className="text-2xl font-bold text-rose-600">{stats.highRiskCount}</p>
            </div>
            <div className={UI.statCard}>
              <p className="lw-muted text-sm">Total interest saved</p>
              <p className={`text-2xl font-bold ${UI.success}`}>
                {INR.format(stats.totalInterestSaved)}
              </p>
            </div>
            <div className={UI.statCard}>
              <p className="lw-muted text-sm">Max interest saved</p>
              <p className="text-2xl font-bold">{INR.format(stats.maxInterestSaved)}</p>
            </div>
          </section>
          <section className={`${UI.card} p-5`}>
            <h2 className={`font-semibold ${UI.titleSm}`}>By loan type</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {stats.byLoanType.length === 0 ? (
                <li>No reports yet.</li>
              ) : (
                stats.byLoanType.map((row) => (
                  <li key={row._id}>
                    {row._id}: {row.count}
                  </li>
                ))
              )}
            </ul>
            <p className="lw-muted mt-3 text-sm">Avg months saved: {stats.avgMonthsSaved}</p>
          </section>
        </>
      ) : null}
    </main>
  );
}
