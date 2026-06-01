import Link from "next/link";

type AuthShellProps = {
  mode: "login" | "signup";
  children: React.ReactNode;
};

const features = [
  { icon: "📊", title: "Save reports", desc: "Store every loan strategy you run" },
  { icon: "💰", title: "Track savings", desc: "See interest and months saved" },
  { icon: "🔒", title: "Your dashboard", desc: "Private access to your data" },
];

export default function AuthShell({ mode, children }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <main className="lw-auth-page flex min-h-[calc(100dvh-4rem)] w-full">
      <aside className="lw-auth-brand relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12">
        <div className="lw-auth-brand-glow pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full" />
        <div className="lw-auth-brand-glow pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-60" />

        <div className="relative z-10">
          <Link href="/" className="lw-auth-brand-logo inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-sm">
              LW
            </span>
            <span className="text-xl font-semibold tracking-tight">LoanWise</span>
          </Link>
          <h2 className="mt-10 text-3xl font-bold leading-tight xl:text-4xl">
            {isLogin ? "Welcome back" : "Start planning smarter"}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85">
            {isLogin
              ? "Sign in to open your dashboard and saved loan reports."
              : "Create a free account to save strategies and track your progress."}
          </p>
        </div>

        <ul className="relative z-10 mt-10 space-y-4">
          {features.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm"
            >
              <span className="text-xl" aria-hidden>
                {item.icon}
              </span>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-white/75">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative z-10 text-xs text-white/60">
          EMI strategy planner · Home, car & personal loans
        </p>
      </aside>

      <div className="lw-auth-form flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-6 w-full max-w-[420px] lg:hidden">
          <Link href="/" className="lw-auth-mobile-brand inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              LW
            </span>
            <span className="text-lg font-semibold">LoanWise</span>
          </Link>
        </div>

        <div className="lw-auth-card w-full max-w-[420px]">{children}</div>

        <Link href="/" className="lw-muted mt-6 text-sm hover:underline">
          ← Back to calculator
        </Link>
      </div>
    </main>
  );
}
