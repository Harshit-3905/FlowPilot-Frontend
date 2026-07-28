"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ApiError, fetchMe } from "@/lib/api-client";
import type { MeResponse } from "@/contracts";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; me: MeResponse }
  | { status: "error"; message: string };

/**
 * Loads `GET /api/v1/me` with the Clerk session JWT as Bearer token.
 */
export function MePanel() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // AppShell owns redirect-to-sign-in; avoid a stuck "Not signed in" alert.
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const me = await fetchMe({ getToken });
        if (!cancelled) setState({ status: "ready", me });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? `${err.code}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Failed to load /me";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  if (state.status === "loading") {
    return <p data-testid="me-loading">Loading account…</p>;
  }

  if (state.status === "error") {
    return (
      <p data-testid="me-error" role="alert">
        {state.message}
      </p>
    );
  }

  return (
    <div data-testid="me-panel">
      <p data-testid="me-id">User id: {state.me.id}</p>
      <p data-testid="me-email">Email: {state.me.email ?? "—"}</p>
    </div>
  );
}
