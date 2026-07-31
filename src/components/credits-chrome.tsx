"use client";

import { formatDisplayM } from "@/lib/format-credits";

type CreditsChromeProps = {
  estimateM: number | null;
  balanceM: number | null;
  insufficient?: boolean;
  loading?: boolean;
};

/**
 * Magica-style header Est / Bal pills (left of Play).
 * @see docs/reference/screenshots/02-canvas/canvas_editor_full_pipeline.png
 */
export function CreditsChrome({
  estimateM,
  balanceM,
  insufficient = false,
  loading = false,
}: CreditsChromeProps) {
  const estLabel =
    estimateM == null ? (loading ? "…" : "—") : formatDisplayM(estimateM);
  const balLabel =
    balanceM == null ? (loading ? "…" : "—") : formatDisplayM(balanceM);

  return (
    <div
      data-testid="credits-chrome"
      className="flex shrink-0 items-center gap-2"
    >
      <span
        data-testid="credits-est"
        data-value={estimateM ?? ""}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-medium text-[var(--text)] shadow-[var(--shadow-soft)]"
        title="Estimated credit cost"
      >
        <EstIcon />
        Est {estLabel} M
      </span>
      <span
        data-testid="credits-bal"
        data-value={balanceM ?? ""}
        data-insufficient={insufficient ? "true" : undefined}
        className={
          insufficient
            ? "inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_6%,white)] px-2.5 py-1 text-xs font-medium text-[var(--danger)] shadow-[var(--shadow-soft)]"
            : "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-medium text-[var(--text)] shadow-[var(--shadow-soft)]"
        }
        title="Credit balance"
      >
        <BalIcon />
        Bal {balLabel} M
      </span>
      {insufficient ? (
        <span
          data-testid="credits-insufficient-hint"
          role="status"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,white)] px-2 py-1 text-xs font-medium text-[var(--danger)]"
        >
          Insufficient credits
        </span>
      ) : null}
    </div>
  );
}

function EstIcon() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0 opacity-70"
    >
      <rect
        x="2"
        y="1.5"
        width="8"
        height="9"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4 4h4M4 6.5h4M4 9h2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BalIcon() {
  return (
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0 opacity-70"
    >
      <rect
        x="1.5"
        y="3"
        width="9"
        height="7"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M1.5 5.5h9"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="8.5" cy="7.5" r="0.9" fill="currentColor" />
    </svg>
  );
}
