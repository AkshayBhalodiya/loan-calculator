"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
const STORAGE_KEY = "loanwise-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type NavItem = { href: string; label: string; match: (path: string) => boolean };

export default function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const email = session?.user?.email;
  const role = session?.user?.role;
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const navItems: NavItem[] = [{ href: "/", label: "Calculator", match: (p) => p === "/" }];

  if (email) {
    navItems.push(
      { href: "/dashboard", label: "Dashboard", match: (p) => p.startsWith("/dashboard") },
      { href: "/reports", label: "Reports", match: (p) => p.startsWith("/reports") }
    );
    if (role === "admin") {
      navItems.push({ href: "/admin", label: "Admin", match: (p) => p.startsWith("/admin") });
    }
  }

  const userInitial = email ? email.charAt(0).toUpperCase() : "?";

  function navLinkClass(active: boolean) {
    return `lw-header-nav-link${active ? " lw-header-nav-link--active" : ""}`;
  }

  return (
    <header className="lw-header print:hidden">
      <div className="lw-header-inner">
        <Link href="/" className="lw-header-brand">
          <span className="lw-header-logo">LW</span>
          <span className="lw-header-brand-text">
            Loan<span className="lw-header-brand-accent">Wise</span>
          </span>
        </Link>

        <nav className="lw-header-nav" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.match(pathname))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="lw-header-actions">
          {status === "loading" ? (
            <span className="lw-header-skeleton" aria-hidden />
          ) : email ? (
            <>
              <div className="lw-header-user hidden sm:flex" title={email}>
                <span className="lw-header-avatar">{userInitial}</span>
                <span className="lw-header-email">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="lw-header-btn lw-header-btn--ghost hidden sm:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="lw-header-btn lw-header-btn--ghost hidden sm:inline-flex">
                Sign up
              </Link>
              <Link href="/login" className="lw-header-btn lw-header-btn--primary hidden sm:inline-flex">
                Sign in
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            disabled={!mounted}
            className="lw-header-theme"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {mounted ? <ThemeIcon mode={theme} /> : <span className="lw-header-theme-dot" />}
          </button>

          <button
            type="button"
            className="lw-header-menu-btn lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="lw-header-mobile lg:hidden">
          <nav className="lw-header-mobile-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(item.match(pathname))}
              >
                {item.label}
              </Link>
            ))}
            {!email ? (
              <>
                <Link href="/signup" className={navLinkClass(pathname === "/signup")}>
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="lw-header-btn lw-header-btn--primary lw-header-mobile-cta"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                <div className="lw-header-mobile-user">
                  <span className="lw-header-avatar">{userInitial}</span>
                  <span className="lw-header-email">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="lw-header-btn lw-header-btn--ghost lw-header-mobile-cta"
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      ) : null}

      {menuOpen ? (
        <button
          type="button"
          className="lw-header-backdrop lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}
