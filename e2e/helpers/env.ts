/**
 * Shared env helpers for FlowPilot Playwright (split FE / API origins).
 */

export function feBaseUrl(): string {
  return process.env.FE_BASE_URL ?? "http://localhost:3000";
}

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? "http://localhost:3001";
}

/** True when Clerk E2E credentials are present (tests skip otherwise). */
export function hasClerkE2ECredentials(): boolean {
  const email =
    process.env.E2E_CLERK_USER_EMAIL ?? process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;
  const secret =
    process.env.CLERK_SECRET_KEY ?? process.env.E2E_CLERK_SECRET_KEY;
  const publishable =
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.E2E_CLERK_PUBLISHABLE_KEY;
  return Boolean(email && password && secret && publishable);
}

export const CLERK_E2E_SKIP_REASON =
  "Set E2E_CLERK_USER_EMAIL, E2E_CLERK_USER_PASSWORD, CLERK_SECRET_KEY, and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY) to run authenticated E2E.";

export function clerkE2EUser(): { email: string; password: string } {
  const email =
    process.env.E2E_CLERK_USER_EMAIL ?? process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(CLERK_E2E_SKIP_REASON);
  }
  return { email, password };
}

/** Origin (scheme + host + port) for split-VPC assertions. */
export function originOf(url: string): string {
  return new URL(url).origin;
}

/**
 * E2E-07 public API key run — needs a real key + owned workflow id.
 * Skips when unset so CI without secrets stays green.
 */
export function hasPublicApiE2ECredentials(): boolean {
  return Boolean(process.env.E2E_API_KEY && process.env.E2E_WORKFLOW_ID);
}

export const PUBLIC_API_E2E_SKIP_REASON =
  "Set E2E_API_KEY and E2E_WORKFLOW_ID (workflow owned by that key’s user) to run E2E-07.";

/** Opt-in flag for extending E2E-08 beyond BE ffmpeg integration (see coverage map). */
export function wantsFfmpegE2E(): boolean {
  return process.env.E2E_FFMPEG === "1";
}
