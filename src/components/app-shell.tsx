"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MePanel } from "@/components/me-panel";
import { NodeConfigForm } from "@/components/nodes/node-config-form";

/** Minimal signed-in shell — header + /me probe (full Magica chrome later). */
export function AppShell() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // Session expired / signed out while shell still mounted — recover via sign-in.
      router.replace("/sign-in?redirect_url=%2Fapp");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <p
        data-testid="app-shell-redirecting"
        className="flex min-h-screen items-center justify-center text-sm text-black/60 dark:text-white/60"
      >
        Redirecting to sign in…
      </p>
    );
  }

  return (
    <div
      data-testid="app-shell"
      className="flex min-h-screen flex-col font-[family-name:var(--font-geist-sans)]"
    >
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/10">
        <Link href="/app" className="text-lg font-semibold tracking-tight">
          FlowPilot
        </Link>
        <UserButton />
      </header>
      <main className="flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-xl font-medium">Workspace</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Signed-in shell — canvas arrives in later slices.
        </p>
        <MePanel />
        <section className="max-w-xl">
          <h2 className="mb-2 text-base font-medium">Node UI Mapper Demo</h2>
          <NodeConfigForm nodeType="gpt_image_2" showHandles />
        </section>
      </main>
    </div>
  );
}
