"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INR } from "@/lib/loan";
import { UI } from "@/lib/ui-classes";
import { useNotificationStore } from "@/hooks/use-notification-store";

type Stats = {
  totalReports: number;
  highRiskCount: number;
  totalInterestSaved: number;
  avgMonthsSaved: number;
  maxInterestSaved: number;
  scope: string;
  byLoanType: { _id: string; count: number }[];
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const { addNotification } = useNotificationStore();

  // Push subscription states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

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

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.error("Service worker registration or check failed:", err);
        });
    }
  }, []);

  async function subscribeUser() {
    if (!swRegistration) {
      addNotification("Push notifications are not supported in this browser.", "warning");
      return;
    }

    setPushLoading(true);
    try {
      // 1. Fetch VAPID key
      const keyRes = await fetch("/api/push/key");
      if (!keyRes.ok) {
        throw new Error("Failed to retrieve public VAPID key.");
      }
      const keyData = await keyRes.json();
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      // 2. Request permission and subscribe
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 3. Save subscription on server
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });

      if (subRes.ok) {
        setIsSubscribed(true);
        addNotification("Push notifications successfully enabled! 🔔", "success");
      } else {
        throw new Error("Failed to save push subscription on the server.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addNotification(`Failed to subscribe: ${msg}`, "error");
    } finally {
      setPushLoading(false);
    }
  }

  async function unsubscribeUser() {
    if (!swRegistration) return;

    setPushLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: null }),
      });

      if (res.ok) {
        setIsSubscribed(false);
        addNotification("Push notifications disabled successfully.", "info");
      }
    } catch (err) {
      addNotification("Failed to unsubscribe from push notifications.", "error");
    } finally {
      setPushLoading(false);
    }
  }

  async function sendTestNotification() {
    setPushLoading(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification("Test push alert dispatched!", "success");
      } else {
        addNotification(data.message || "Failed to trigger test push.", "error");
      }
    } catch (err) {
      addNotification("Network error sending test push.", "error");
    } finally {
      setPushLoading(false);
    }
  }

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

      {/* Push Notifications Section */}
      <section className={`${UI.card} p-5 space-y-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className={`font-semibold ${UI.titleSm}`}>Push Notifications</h2>
            <p className={UI.subtitleSm}>Receive prepayment strategy alerts and notifications directly on your browser.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          {isSubscribed ? (
            <>
              <button
                type="button"
                onClick={unsubscribeUser}
                disabled={pushLoading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Disable Notifications
              </button>
              <button
                type="button"
                onClick={sendTestNotification}
                disabled={pushLoading}
                className={`${UI.btnPrimary} cursor-pointer`}
              >
                Send Test Alert 🚀
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={subscribeUser}
              disabled={pushLoading}
              className={`${UI.btnPrimary} cursor-pointer`}
            >
              Enable Notifications
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
