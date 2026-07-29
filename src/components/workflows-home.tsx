"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  ListWorkflowsResponseSchema,
  CreateWorkflowResponseSchema,
  type ListWorkflowsResponse,
} from "@/contracts";

export function WorkflowsHome() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<
    ListWorkflowsResponse["workflows"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/workflows", {
      getToken,
      schema: ListWorkflowsResponseSchema,
    })
      .then((data) => setWorkflows(data.workflows))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [getToken]);

  async function handleCreate() {
    setCreating(true);
    try {
      const wf = await apiFetch("/api/v1/workflows", {
        getToken,
        schema: CreateWorkflowResponseSchema,
        method: "POST",
        body: { name: "Untitled Workflow" },
      });
      router.push(`/workflows/${wf.id}`);
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/v1/workflows/${id}`, {
        getToken,
        schema: CreateWorkflowResponseSchema,
        method: "DELETE",
      });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div data-testid="workflows-home" className="flex-1 overflow-y-auto bg-[var(--bg)] p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Your Workflows</h1>
          <button
            data-testid="new-workflow-btn"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--panel)] hover:opacity-80 disabled:opacity-50"
          >
            {creating ? "Creating…" : "New Workflow"}
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-[var(--danger)]" data-testid="workflows-error">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]" data-testid="workflows-loading">
            Loading…
          </p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]" data-testid="workflows-empty">
            No workflows yet. Create one to get started.
          </p>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="workflows-list"
          >
            {workflows.map((wf) => (
              <div
                key={wf.id}
                data-testid={`workflow-card-${wf.id}`}
                className="flex items-start justify-between rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm hover:border-[var(--text-muted)]"
              >
                <button
                  onClick={() => router.push(`/workflows/${wf.id}`)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-[var(--text)]">{wf.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {new Date(wf.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  data-testid={`delete-workflow-${wf.id}`}
                  onClick={() => handleDelete(wf.id, wf.name)}
                  disabled={deletingId === wf.id}
                  className="ml-2 text-xs text-[var(--danger)] hover:opacity-80 disabled:opacity-50"
                >
                  {deletingId === wf.id ? "…" : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
