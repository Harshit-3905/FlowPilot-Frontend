import {
  CreditsBalanceResponseSchema,
  CreditsEstimateResponseSchema,
  type CreditsBalanceResponse,
  type CreditsEstimateResponse,
} from "@/contracts";
import { apiFetch, type GetToken } from "@/lib/api-client";

export function fetchCreditsBalance(options: {
  getToken: GetToken;
}): Promise<CreditsBalanceResponse> {
  return apiFetch("/api/v1/credits", {
    getToken: options.getToken,
    schema: CreditsBalanceResponseSchema,
  });
}

export function fetchCreditsEstimate(options: {
  getToken: GetToken;
  workflowId: string;
}): Promise<CreditsEstimateResponse> {
  return apiFetch("/api/v1/credits/estimate", {
    getToken: options.getToken,
    schema: CreditsEstimateResponseSchema,
    method: "POST",
    body: { workflowId: options.workflowId },
  });
}
