"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UI } from "@/lib/ui-classes";

type ReportActionsProps = {
  reportId: string;
  initialTitle: string;
  initialNotes: string;
};

export default function ReportActions({
  reportId,
  initialTitle,
  initialNotes,
}: ReportActionsProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function patchReport() {
    setMessage("Saving...");
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes }),
    });
    const data = await res.json();
    setMessage(data.success ? "Saved." : data.message || "Update failed.");
    if (data.success) router.refresh();
  }

  async function deleteReport() {
    if (!confirm("Delete this report permanently?")) return;
    setMessage("Deleting...");
    const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      router.push("/reports");
      return;
    }
    setMessage(data.message || "Delete failed.");
  }

  async function sendEmail() {
    if (!email) {
      setMessage("Enter an email address.");
      return;
    }
    setMessage("Sending email...");
    const res = await fetch(`/api/reports/${reportId}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email }),
    });
    const data = await res.json();
    setMessage(data.success ? `Email sent to ${email}` : data.message || "Email failed.");
  }

  return (
    <section className={UI.card}>
      <h2 className={UI.title}>Manage Report</h2>
      <div className="mt-3 grid gap-3">
        <label className={UI.label}>
          Title
          <input
            className={UI.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={UI.label}>
          Notes
          <textarea
            className={UI.input}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label className={UI.label}>
          Email report to
          <input
            type="email"
            className={UI.input}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={patchReport} className={UI.btnPrimary}>
          Save title & notes
        </button>
        <button type="button" onClick={sendEmail} className={UI.btnSecondary}>
          Send email
        </button>
        <a
          href={`/api/reports/${reportId}/export?format=json`}
          className={UI.btnSecondary}
        >
          Export JSON
        </a>
        <a
          href={`/api/reports/${reportId}/export?format=csv`}
          className={UI.btnSecondary}
        >
          Export CSV
        </a>
        <button
          type="button"
          onClick={deleteReport}
          className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-500"
        >
          Delete
        </button>
      </div>
      {message ? <p className="lw-muted mt-2 text-sm">{message}</p> : null}
    </section>
  );
}
