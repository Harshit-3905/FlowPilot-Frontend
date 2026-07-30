"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  ListWorkflowsResponseSchema,
  CreateWorkflowResponseSchema,
  DeleteWorkflowResponseSchema,
  type ListWorkflowsResponse,
} from "@/contracts";
import { ConfirmModal } from "@/components/confirm-modal";

/** Magica system templates shown on home (static; open → create named workflow). */
const SYSTEM_WORKFLOWS = [
  { id: "sys_racing", name: "AI Racing Car Generator" },
] as const;

export function formatEditedAgo(iso: string, nowMs = Date.now()): string {
  const diffMs = Math.max(0, nowMs - new Date(iso).getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Edited just now";
  if (mins < 60) return `Edited ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Edited ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Edited ${days}d ago`;
  return `Edited ${new Date(iso).toLocaleDateString()}`;
}

export function WorkflowsHome() {
  const { getToken } = useAuth();
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [workflows, setWorkflows] = useState<
    ListWorkflowsResponse["workflows"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch("/api/v1/workflows", {
      getToken,
      schema: ListWorkflowsResponseSchema,
    })
      .then((data) => setWorkflows(data.workflows))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [getToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter((w) => w.name.toLowerCase().includes(q));
  }, [workflows, query]);

  async function createAndOpen(name?: string) {
    setCreating(true);
    try {
      const wf = await apiFetch("/api/v1/workflows", {
        getToken,
        schema: CreateWorkflowResponseSchema,
        method: "POST",
        body: { name: name ?? "Untitled Workflow" },
      });
      if (name) {
        await apiFetch(`/api/v1/workflows/${wf.id}`, {
          getToken,
          schema: CreateWorkflowResponseSchema,
          method: "PATCH",
          body: { name },
        });
      }
      router.push(`/workflows/${wf.id}`);
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  }

  async function handleCreate() {
    await createAndOpen();
  }

  async function handleImportFile(file: File) {
    setCreating(true);
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as {
        name?: string;
        nodes?: unknown[];
        edges?: unknown[];
        viewport?: { x: number; y: number; zoom: number };
        graph?: {
          nodes?: unknown[];
          edges?: unknown[];
          viewport?: { x: number; y: number; zoom: number };
        };
      };
      const name =
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim()
          : file.name.replace(/\.json$/i, "") || "Imported Workflow";
      const graph = raw.graph ?? {
        nodes: raw.nodes ?? [],
        edges: raw.edges ?? [],
        viewport: raw.viewport ?? { x: 0, y: 0, zoom: 1 },
      };

      const wf = await apiFetch("/api/v1/workflows", {
        getToken,
        schema: CreateWorkflowResponseSchema,
        method: "POST",
        body: { name },
      });
      await apiFetch(`/api/v1/workflows/${wf.id}`, {
        getToken,
        schema: CreateWorkflowResponseSchema,
        method: "PATCH",
        body: { name, graph },
      });
      router.push(`/workflows/${wf.id}`);
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setDeletingId(id);
    setError(null);
    try {
      await apiFetch(`/api/v1/workflows/${id}`, {
        getToken,
        schema: DeleteWorkflowResponseSchema,
        method: "DELETE",
      });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setPendingDelete(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      data-testid="workflows-home"
      className="flex-1 overflow-y-auto bg-[var(--bg)] px-10 py-8"
    >
      <div className="mx-auto max-w-5xl">
        {/* Page header — Magica: title + subtitle | Import + Add */}
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
              FlowPilot
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Build workflows or run models directly
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="import-workflow-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImportFile(file);
              }}
            />
            <button
              type="button"
              data-testid="import-workflow-btn"
              disabled={creating}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 9.5V2M7 2L4.5 4.5M7 2l2.5 2.5M2.5 9.5v1.75A.75.75 0 003.25 12h7.5a.75.75 0 00.75-.75V9.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Import
            </button>
            <button
              type="button"
              data-testid="new-workflow-btn"
              onClick={() => void handleCreate()}
              disabled={creating}
              aria-label={creating ? "Creating…" : "Add workflow"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--field-radius)] bg-[var(--text)] text-[var(--panel)] hover:opacity-80 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <p
            className="mb-4 text-sm text-[var(--danger)]"
            data-testid="workflows-error"
          >
            {error}
          </p>
        )}

        {/* System Workflows */}
        <section className="mb-12" data-testid="system-workflows">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            System Workflows
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Prebuilt workflow templates - click to open and start using.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEM_WORKFLOWS.map((sys) => (
              <button
                key={sys.id}
                type="button"
                data-testid={`system-workflow-card-${sys.id}`}
                disabled={creating}
                onClick={() => void createAndOpen(sys.name)}
                className="group overflow-hidden rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] text-left shadow-sm hover:border-[var(--text-muted)] disabled:opacity-50"
              >
                <div
                  className="aspect-[16/10] bg-[linear-gradient(145deg,#dbeafe_0%,#e5e7eb_45%,#f3f4f6_100%)]"
                  aria-hidden
                />
                <div className="border-t border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-center">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {sys.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Your Workflows */}
        <section data-testid="your-workflows">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">
                Your Workflows
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Open one to edit, run, and review history.
              </p>
            </div>
            <label className="relative block w-full max-w-xs">
              <span className="sr-only">Search workflows</span>
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--text-muted)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle
                    cx="6"
                    cy="6"
                    r="4.25"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M9.2 9.2L12 12"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                data-testid="workflows-search"
                type="search"
                placeholder="Search workflows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-[var(--border)] bg-[var(--panel)] py-1.5 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)]"
              />
            </label>
          </div>

          {loading ? (
            <p
              className="text-sm text-[var(--text-muted)]"
              data-testid="workflows-loading"
            >
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p
              className="text-sm text-[var(--text-muted)]"
              data-testid="workflows-empty"
            >
              {workflows.length === 0
                ? "No workflows yet. Create one to get started."
                : "No workflows match your search."}
            </p>
          ) : (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="workflows-list"
            >
              {filtered.map((wf) => (
                <div
                  key={wf.id}
                  data-testid={`workflow-card-${wf.id}`}
                  className="group relative overflow-hidden rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] shadow-sm hover:border-[var(--text-muted)]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/workflows/${wf.id}`)}
                    className="block w-full text-left"
                  >
                    <div
                      className="aspect-[16/10] bg-[linear-gradient(145deg,#e8e8ed_0%,#f5f5f7_55%,#ffffff_100%)]"
                      aria-hidden
                    />
                    <div className="px-3 py-3">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {wf.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatEditedAgo(wf.updatedAt)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-workflow-${wf.id}`}
                    onClick={() =>
                      setPendingDelete({ id: wf.id, name: wf.name })
                    }
                    disabled={deletingId === wf.id}
                    className="absolute right-2 top-2 rounded-md bg-[var(--panel)]/90 px-2 py-1 text-xs text-[var(--danger)] opacity-0 shadow-sm group-hover:opacity-100 hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === wf.id ? "…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        open={pendingDelete != null}
        title="Delete workflow"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        danger
        busy={deletingId != null}
        testId="delete-workflow-modal"
        onCancel={() => {
          if (deletingId == null) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
