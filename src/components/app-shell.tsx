"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function RailIcon({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex h-9 w-9 items-center justify-center" aria-hidden="true">
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Signed-in shell — narrow left icon rail + child content (Magica chrome). */
export function AppShell({ children }: { children?: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onApiKeys = pathname?.startsWith("/settings/api-keys") ?? false;
  const onWorkflowEditor =
    pathname != null && /^\/workflows\/[^/]+/.test(pathname);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=%2F");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <p
        data-testid="app-shell-redirecting"
        className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--text-muted)]"
      >
        Redirecting to sign in…
      </p>
    );
  }

  const railBtn =
    "flex h-9 w-9 items-center justify-center rounded-[var(--field-radius)] text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]";
  const railActive = "bg-[var(--bg)] text-[var(--text)]";

  return (
    <div
      data-testid="app-shell"
      className="flex h-screen bg-[var(--bg)] font-[family-name:var(--font-geist-sans)] text-[var(--text)]"
    >
      <aside
        data-testid="app-rail"
        className="flex w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--panel)] py-3"
      >
        <Link
          href="/"
          aria-label="FlowPilot"
          data-testid="rail-brand"
          className={`${railBtn} mb-4`}
        >
          <RailIcon label="FlowPilot home">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle
                cx="10"
                cy="10"
                r="8.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 6v8M6 10h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </RailIcon>
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          <Link
            href="/"
            aria-label="Workflows"
            data-testid="rail-workflows"
            className={`${railBtn} ${onHome ? railActive : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="2"
                y="2"
                width="5.5"
                height="5.5"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="10.5"
                y="2"
                width="5.5"
                height="5.5"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="2"
                y="10.5"
                width="5.5"
                height="5.5"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="10.5"
                y="10.5"
                width="5.5"
                height="5.5"
                rx="1.2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </Link>
          {onWorkflowEditor ? (
            <>
              <button
                type="button"
                aria-label="Add node"
                data-testid="rail-add-node"
                className={railBtn}
                onClick={() =>
                  window.dispatchEvent(new Event("flowpilot:open-palette"))
                }
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M9 3.5v11M3.5 9h11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Search nodes"
                data-testid="rail-search-nodes"
                className={railBtn}
                onClick={() =>
                  window.dispatchEvent(new Event("flowpilot:open-palette"))
                }
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M11.5 11.5L15 15"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          ) : null}
          <Link
            href="/settings/api-keys"
            aria-label="API keys"
            data-testid="nav-api-keys"
            className={`${railBtn} ${onApiKeys ? railActive : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="9"
                cy="9"
                r="2.2"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M13.6 4.4l-1.4 1.4M5.8 12.2l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </nav>

        <div className="mt-auto flex flex-col items-center pt-2" data-testid="rail-user">
          <UserButton />
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
