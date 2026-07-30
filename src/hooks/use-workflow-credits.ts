"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import {
  fetchCreditsBalance,
  fetchCreditsEstimate,
} from "@/lib/credits-api";
import { toDisplayM } from "@/lib/format-credits";

export type WorkflowCreditsState = {
  balanceM: number | null;
  estimateM: number | null;
  insufficient: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Loads GET /credits + POST /credits/estimate for the editor shell.
 * Refresh on mount and before Play (caller invokes `refresh`).
 */
export function useWorkflowCredits(workflowId: string): WorkflowCreditsState {
  const { getToken } = useAuth();
  const [balanceM, setBalanceM] = useState<number | null>(null);
  const [estimateM, setEstimateM] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [balance, estimate] = await Promise.all([
        fetchCreditsBalance({ getToken }),
        fetchCreditsEstimate({ getToken, workflowId }),
      ]);
      setBalanceM(toDisplayM(balance.displayM, balance.balance));
      setEstimateM(toDisplayM(estimate.displayM, estimate.total));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getToken, workflowId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  const insufficient =
    balanceM != null && estimateM != null && estimateM > balanceM;

  return { balanceM, estimateM, insufficient, loading, error, refresh };
}
