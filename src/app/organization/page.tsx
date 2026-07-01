"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UI } from "@/lib/ui-classes";
import { useNotificationStore } from "@/hooks/use-notification-store";

type OrgInfo = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
};

type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function OrganizationPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { addNotification } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);

  // Form states
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const [leaveLoading, setLeaveLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchOrgData() {
    try {
      const res = await fetch("/api/organizations/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrg(data.organization);
          setMembers(data.members || []);
        }
      }
    } catch (err) {
      console.error("Failed to load organization:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/organization");
    } else if (status === "authenticated") {
      fetchOrgData();
    }
  }, [status, router]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addNotification("Organization created successfully!", "success");
        setCreateName("");
        await update(); // refresh session orgId
        await fetchOrgData();
      } else {
        addNotification(data.message || "Failed to create organization.", "error");
      }
    } catch (err) {
      addNotification("An unexpected error occurred.", "error");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoinOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setJoinLoading(true);
    try {
      const res = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addNotification(`Joined ${data.organization.name} successfully!`, "success");
        setJoinCode("");
        await update(); // refresh session orgId
        await fetchOrgData();
      } else {
        addNotification(data.message || "Failed to join organization.", "error");
      }
    } catch (err) {
      addNotification("An unexpected error occurred.", "error");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleLeaveOrg() {
    if (!confirm("Are you sure you want to leave this organization? You will lose access to all shared reports.")) return;

    setLeaveLoading(true);
    try {
      const res = await fetch("/api/organizations/leave", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        addNotification("Left organization successfully.", "success");
        setOrg(null);
        setMembers([]);
        await update(); // refresh session orgId
        await fetchOrgData();
      } else {
        addNotification(data.message || "Failed to leave organization.", "error");
      }
    } catch (err) {
      addNotification("An unexpected error occurred.", "error");
    } finally {
      setLeaveLoading(false);
    }
  }

  function handleCopyCode() {
    if (!org) return;
    navigator.clipboard.writeText(org.inviteCode);
    setCopied(true);
    addNotification("Invite code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Loading organization dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8">
      {/* Hero / Header */}
      <section className={UI.hero}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={UI.titleHero}>Organization Hub</h1>
            <p className={UI.subtitle}>Manage team collaboration, shared workspace, and multi-tenant report access.</p>
          </div>
          <Link href="/reports" className={UI.btnHero}>
            Go to Reports
          </Link>
        </div>
      </section>

      {/* Main Content Card Container */}
      {!org ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Org card */}
          <section className={`${UI.card} flex flex-col justify-between hover:border-indigo-500/30 transition-all duration-300`}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={UI.title}>Create Organization</h2>
              </div>
              <p className={UI.subtitleSm}>
                Set up a new organization. You will become the administrator and will be able to invite your team members using a unique invite code.
              </p>
            </div>
            
            <form onSubmit={handleCreateOrg} className="mt-6 space-y-4">
              <label className={UI.label}>
                Organization Name
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Financial Group"
                  className={UI.input}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={createLoading}
                className={`${UI.btnPrimary} w-full py-2.5 flex items-center justify-center gap-2`}
              >
                {createLoading ? "Creating..." : "Create Organization"}
              </button>
            </form>
          </section>

          {/* Join Org card */}
          <section className={`${UI.card} flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300`}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={UI.title}>Join Organization</h2>
              </div>
              <p className={UI.subtitleSm}>
                Already have a team? Ask the organization creator/admin for their unique 6-character invite code and enter it below.
              </p>
            </div>

            <form onSubmit={handleJoinOrg} className="mt-6 space-y-4">
              <label className={UI.label}>
                Invite Code
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. AB12CD"
                  className={`${UI.input} uppercase tracking-wider text-center font-mono`}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={joinLoading}
                className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
              >
                {joinLoading ? "Joining..." : "Join Workspace"}
              </button>
            </form>
          </section>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Org details */}
          <section className={`${UI.card} md:col-span-2 space-y-6`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Active Workspace</span>
                <h2 className={`${UI.titleHero} mt-1`}>{org.name}</h2>
              </div>
              <button
                type="button"
                onClick={handleLeaveOrg}
                disabled={leaveLoading}
                className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
              >
                {leaveLoading ? "Leaving..." : "Leave Team"}
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Invite Code</h3>
              <p className={UI.subtitleSm}>Share this code with team members so they can join your workspace.</p>
              
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-slate-100 dark:bg-slate-800 rounded-xl px-6 py-3 font-mono text-2xl font-bold tracking-widest text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                  {org.inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center justify-center"
                  title="Copy Invite Code"
                >
                  {copied ? (
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-2">
              <div className={UI.boxIndigo}>
                <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">Multi-Tenant Isolation Notice</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1 leading-relaxed">
                  All prepayment strategies and loan reports created by members of <strong>{org.name}</strong> are immediately shared among everyone in the organization. Security filters isolate these reports from all other organizations.
                </p>
              </div>
            </div>
          </section>

          {/* Members list */}
          <section className={UI.card}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Workspace Members ({members.length})</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[360px] pr-2">
              {members.map((member) => {
                const initials = member.name.charAt(0).toUpperCase();
                const isOwner = member.email === org.createdBy;
                return (
                  <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {member.name}
                        {isOwner && (
                          <span className="rounded bg-amber-100 dark:bg-amber-950/40 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="text-xs truncate text-slate-400 dark:text-slate-500">{member.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
