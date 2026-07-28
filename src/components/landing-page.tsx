"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

/** Minimal signed-out landing — FlowPilot chrome only (full Magica clone later). */
export function LandingPage() {
  return (
    <main
      data-testid="landing"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 font-[family-name:var(--font-geist-sans)]"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">FlowPilot</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Visual workflow builder
        </p>
      </div>
      <Show when="signed-out">
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <button
              type="button"
              data-testid="sign-in"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              data-testid="sign-up"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
            >
              Sign up
            </button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <div className="flex items-center gap-3">
          <UserButton />
          <Link
            href="/app"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Open app
          </Link>
        </div>
      </Show>
      <p className="text-xs text-black/50 dark:text-white/50">
        Prefer full page?{" "}
        <Link href="/sign-in" className="underline underline-offset-2">
          Sign in
        </Link>
        {" · "}
        <Link href="/sign-up" className="underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </main>
  );
}
