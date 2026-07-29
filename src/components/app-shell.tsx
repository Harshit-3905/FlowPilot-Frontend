"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Signed-in shell — header + child content. */
export function AppShell({ children }: { children?: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

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

  return (
    <div
      data-testid="app-shell"
      className="flex h-screen flex-col bg-[var(--bg)] font-[family-name:var(--font-geist-sans)] text-[var(--text)]"
    >
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--panel)] px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--text)]">
          FlowPilot
        </Link>
        <UserButton />
      </header>
      <main className="relative flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
