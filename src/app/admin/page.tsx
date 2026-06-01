import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { UserModel } from "@/lib/user-model";
import { ReportModel } from "@/lib/report-model";
import { UI } from "@/lib/ui-classes";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    redirect("/login?callbackUrl=/admin");
  }

  let users: {
    id: string;
    email: string;
    name: string;
    createdAt?: Date;
    reportCount: number;
  }[] = [];
  let error = "";

  try {
    await connectMongo();
    const docs = await UserModel.find().select("-passwordHash").sort({ createdAt: -1 }).lean();
    const reportCounts = await ReportModel.aggregate([
      { $match: { userId: { $ne: null } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(
      reportCounts.map((row) => [row._id as string, row.count as number])
    );

    users = docs.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name ?? "",
      createdAt: u.createdAt,
      reportCount: countMap.get(u.email) ?? 0,
    }));
  } catch {
    error = "Could not load users. Check MongoDB connection.";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <section className={UI.hero}>
        <h1 className={UI.titleHero}>Admin Panel</h1>
        <p className={UI.subtitle}>All registered users and their report counts.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/" className={UI.btnHero}>
            Calculator
          </Link>
          <Link href="/dashboard" className={UI.btnPrimary}>
            Dashboard
          </Link>
        </div>
      </section>

      {error ? (
        <p className="lw-alert-warning rounded-md p-4">{error}</p>
      ) : null}

      <section className={`${UI.card} overflow-x-auto p-0`}>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="lw-table-head border-b border-[var(--lw-border)]">
            <tr>
              <th className="p-3 font-semibold">#</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Email</th>
              <th className="p-3 font-semibold">Reports</th>
              <th className="p-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="lw-muted p-6">
                  No users registered yet.
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={user.id} className="lw-table-row">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{user.name || "—"}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.reportCount}</td>
                  <td className="p-3">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleString("en-IN")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="lw-muted border-t border-[var(--lw-border)] p-3 text-xs">
          Total users: {users.length}
        </p>
      </section>
    </main>
  );
}
