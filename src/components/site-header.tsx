"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "midnight" | "system";
const STORAGE_KEY = "loanwise-theme";

export function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark", "midnight");
  
  let resolved: "light" | "dark" | "midnight" = "light";
  if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolved = isDark ? "dark" : "light";
  } else {
    resolved = mode;
  }
  
  root.classList.add(resolved);
  root.style.colorScheme = resolved === "light" ? "light" : "dark";
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
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial =
      saved === "light" || saved === "dark" || saved === "midnight" || saved === "system"
        ? saved
        : "system";
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system" || !mounted) return;
    
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      applyTheme("system");
    };
    
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme, mounted]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);



  const navItems: NavItem[] = [{ href: "/", label: "Calculator", match: (p) => p === "/" }];

  if (email) {
    navItems.push(
      { href: "/dashboard", label: "Dashboard", match: (p) => p.startsWith("/dashboard") },
      { href: "/reports", label: "Reports", match: (p) => p.startsWith("/reports") },
      { href: "/organization", label: "Organization", match: (p) => p.startsWith("/organization") }
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowThemeMenu((o) => !o)}
              disabled={!mounted}
              className="lw-header-theme flex items-center justify-center"
              aria-label="Select theme"
              title="Select theme"
              id="theme-dropdown-btn"
            >
              {mounted ? (
                theme === "light" ? (
                  <span>☀️</span>
                ) : theme === "dark" ? (
                  <span>🌙</span>
                ) : theme === "midnight" ? (
                  <span>🌌</span>
                ) : (
                  <span>💻</span>
                )
              ) : (
                <span className="lw-header-theme-dot" />
              )}
            </button>

            {showThemeMenu && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default bg-transparent"
                  onClick={() => setShowThemeMenu(false)}
                />
                <div 
                  className="absolute right-0 mt-2 w-36 rounded-xl border border-[var(--lw-border)] bg-[var(--lw-surface)] p-1 shadow-lg z-20"
                  role="menu"
                >
                  {[
                    { id: "light", label: "Light", icon: "☀️" },
                    { id: "dark", label: "Dark", icon: "🌙" },
                    { id: "midnight", label: "Midnight", icon: "🌌" },
                    { id: "system", label: "System", icon: "💻" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setTheme(option.id as ThemeMode);
                        localStorage.setItem(STORAGE_KEY, option.id);
                        applyTheme(option.id as ThemeMode);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-semibold hover:bg-[var(--lw-surface-muted)] transition-colors ${
                        theme === option.id
                          ? "bg-[var(--lw-surface-accent-b)] text-[var(--lw-link)]"
                          : "text-[var(--lw-text)]"
                      }`}
                      role="menuitem"
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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
