"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import type { ApiKeyListItem, CreateApiKeyResponse } from "@/contracts";
import { ConfirmModal } from "@/components/confirm-modal";
import { ApiError } from "@/lib/api-client";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api-keys-api";

function maskPrefix(prefix: string): string {
  return `${prefix}…`;
}

/**
 * Settings: create / list masked / revoke API keys.
 * Full raw key is shown only once in a post-create modal.
 */
export function ApiKeysSettings() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [createdOnce, setCreatedOnce] = useState<CreateApiKeyResponse | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const data = await listApiKeys({ getToken });
    setKeys(data.keys);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void refresh()
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `${err.code}: ${err.message}`
            : err instanceof Error
              ? err.message
              : "Failed to load API keys",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createApiKey({ getToken, name: trimmed });
      setCreatedOnce(created);
      setName("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Failed to create API key",
      );
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    const { id } = pendingRevoke;
    setRevokingId(id);
    setError(null);
    try {
      await revokeApiKey({ getToken, id });
      setPendingRevoke(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Failed to revoke API key",
      );
    } finally {
      setRevokingId(null);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div
      data-testid="api-keys-settings"
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--text)]">
        API keys
      </h1>
      <p className="mb-8 text-sm text-[var(--text-muted)]">
        Create keys for the public REST API. The full secret is shown only once
        after create.
      </p>

      <form
        data-testid="api-keys-create-form"
        onSubmit={handleCreate}
        className="mb-8 flex flex-wrap items-end gap-3"
      >
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">Name</span>
          <input
            data-testid="api-keys-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production"
            className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--text)]"
          />
        </label>
        <button
          type="submit"
          data-testid="api-keys-create-btn"
          disabled={creating || !name.trim()}
          className="rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--panel)] hover:opacity-80 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          data-testid="api-keys-error"
          className="mb-4 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p
          data-testid="api-keys-loading"
          className="text-sm text-[var(--text-muted)]"
        >
          Loading…
        </p>
      ) : keys.length === 0 ? (
        <p
          data-testid="api-keys-empty"
          className="text-sm text-[var(--text-muted)]"
        >
          No API keys yet.
        </p>
      ) : (
        <ul data-testid="api-keys-list" className="space-y-2">
          {keys.map((key) => (
            <li
              key={key.id}
              data-testid={`api-key-row-${key.id}`}
              className="flex items-center justify-between gap-4 border border-[var(--border)] bg-[var(--panel)] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text)]">
                  {key.name}
                </p>
                <p
                  data-testid={`api-key-masked-${key.id}`}
                  className="font-mono text-xs text-[var(--text-muted)]"
                >
                  {maskPrefix(key.prefix)}
                  {key.revokedAt ? " · revoked" : ""}
                </p>
              </div>
              {!key.revokedAt ? (
                <button
                  type="button"
                  data-testid={`api-key-revoke-${key.id}`}
                  disabled={revokingId === key.id}
                  onClick={() =>
                    setPendingRevoke({ id: key.id, label: key.name })
                  }
                  className="shrink-0 text-sm text-[var(--danger)] hover:underline disabled:opacity-50"
                >
                  {revokingId === key.id ? "Revoking…" : "Revoke"}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  Revoked
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {createdOnce ? (
        <div
          data-testid="api-key-created-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-key-created-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-lg">
            <h2
              id="api-key-created-title"
              className="mb-2 text-lg font-semibold text-[var(--text)]"
            >
              Copy your API key
            </h2>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              This is the only time the full key is shown. Store it securely.
            </p>
            <code
              data-testid="api-key-created-secret"
              className="mb-6 block break-all rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)]"
            >
              {createdOnce.key}
            </code>
            <button
              type="button"
              data-testid="api-key-created-dismiss"
              onClick={() => setCreatedOnce(null)}
              className="rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--panel)] hover:opacity-80"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={pendingRevoke != null}
        title="Revoke API key"
        message={
          pendingRevoke
            ? `Revoke "${pendingRevoke.label}"? Clients using this key will fail immediately.`
            : ""
        }
        confirmLabel="Revoke"
        danger
        busy={revokingId != null}
        testId="revoke-api-key-modal"
        onCancel={() => {
          if (revokingId == null) setPendingRevoke(null);
        }}
        onConfirm={() => void confirmRevoke()}
      />
      </div>
    </div>
  );
}
