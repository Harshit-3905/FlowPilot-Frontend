import {
  ApiKeyListResponseSchema,
  CreateApiKeyResponseSchema,
  RevokeApiKeyResponseSchema,
  type ApiKeyListResponse,
  type CreateApiKeyResponse,
  type RevokeApiKeyResponse,
} from "@/contracts";
import { apiFetch, type GetToken } from "@/lib/api-client";

export function listApiKeys(options: {
  getToken: GetToken;
}): Promise<ApiKeyListResponse> {
  return apiFetch("/api/v1/api-keys", {
    getToken: options.getToken,
    schema: ApiKeyListResponseSchema,
  });
}

export function createApiKey(options: {
  getToken: GetToken;
  name: string;
}): Promise<CreateApiKeyResponse> {
  return apiFetch("/api/v1/api-keys", {
    getToken: options.getToken,
    schema: CreateApiKeyResponseSchema,
    method: "POST",
    body: { name: options.name },
  });
}

export function revokeApiKey(options: {
  getToken: GetToken;
  id: string;
}): Promise<RevokeApiKeyResponse> {
  return apiFetch(`/api/v1/api-keys/${options.id}`, {
    getToken: options.getToken,
    schema: RevokeApiKeyResponseSchema,
    method: "DELETE",
  });
}
