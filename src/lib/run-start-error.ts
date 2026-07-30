import { ApiError } from "@/lib/api-client";
import { formatDisplayM } from "@/lib/format-credits";

export type RunStartUiError = {
  /** Wire / API code when available (e.g. `insufficient_credits`). */
  code: string;
  message: string;
  details?: unknown;
};

type CreditsDisplayDetails = {
  displayM?: { balance?: unknown; required?: unknown };
};

function creditsDisplayFromDetails(
  details: unknown,
): { balanceM: number; requiredM: number } | null {
  if (!details || typeof details !== "object") return null;
  const displayM = (details as CreditsDisplayDetails).displayM;
  if (!displayM || typeof displayM !== "object") return null;
  const balanceM = displayM.balance;
  const requiredM = displayM.required;
  if (typeof balanceM !== "number" || typeof requiredM !== "number") {
    return null;
  }
  return { balanceM, requiredM };
}

/**
 * Map run-start failures to UI copy. 402 / `insufficient_credits` gets an
 * explicit banner message with Est/Bal-style M amounts when details exist.
 */
export function formatRunStartError(err: unknown): RunStartUiError {
  if (err instanceof ApiError) {
    if (err.code === "insufficient_credits" || err.status === 402) {
      const amounts = creditsDisplayFromDetails(err.details);
      if (amounts) {
        return {
          code: "insufficient_credits",
          message: `Insufficient credits: need ${formatDisplayM(amounts.requiredM)} M, have ${formatDisplayM(amounts.balanceM)} M.`,
          details: err.details,
        };
      }
      return {
        code: "insufficient_credits",
        message: err.message || "Insufficient credits to start this run.",
        details: err.details,
      };
    }
    return {
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  if (err instanceof Error) {
    return { code: "client_error", message: err.message };
  }

  return { code: "client_error", message: String(err) };
}
