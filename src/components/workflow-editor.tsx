"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { WorkflowDetailResponseSchema } from "@/contracts";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import { NodePalette } from "@/components/node-palette";
import { HistorySidebar } from "@/components/history-sidebar";
import { CreditsChrome } from "@/components/credits-chrome";
import {
  WorkflowRunProvider,
  useWorkflowRun,
} from "@/components/workflow-run-context";
import { useEditorStore, type WorkflowGraphDTO } from "@/store/editor-store";
import { useAutoSave, type SaveStatus } from "@/hooks/use-auto-save";
import { useWorkflowCredits } from "@/hooks/use-workflow-credits";
import { z } from "zod";

const PatchResponseSchema = z.object({ id: z.string() }).passthrough();

type EditorTab = "playground" | "api" | "workflow";

export function WorkflowEditor({ workflowId }: { workflowId: string }) {
  return (
    <WorkflowRunProvider workflowId={workflowId}>
      <WorkflowEditorInner workflowId={workflowId} />
    </WorkflowRunProvider>
  );
}

function WorkflowEditorInner({ workflowId }: { workflowId: string }) {
  const { getToken } = useAuth();
  const loadGraph = useEditorStore((s) => s.loadGraph);
  const runCtx = useWorkflowRun();
  const credits = useWorkflowCredits(workflowId);
  const { refresh: refreshCredits } = credits;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [tab, setTab] = useState<EditorTab>("workflow");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const saveStatus = useAutoSave(workflowId, getToken);

  const handlePlay = useCallback(async () => {
    setHistoryOpen(true);
    // Refresh Est/Bal immediately before run (Slice 4); BE block is Slice 5.
    await refreshCredits();
    await runCtx?.runWorkflow();
  }, [refreshCredits, runCtx]);

  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRename = useCallback(
    (name: string) => {
      setWorkflowName(name);
      if (renameTimer.current) clearTimeout(renameTimer.current);
      renameTimer.current = setTimeout(() => {
        void apiFetch(`/api/v1/workflows/${workflowId}`, {
          getToken,
          schema: PatchResponseSchema,
          method: "PATCH",
          body: { name },
        });
      }, 600);
    },
    [workflowId, getToken],
  );

  useEffect(() => {
    apiFetch(`/api/v1/workflows/${workflowId}`, {
      getToken,
      schema: WorkflowDetailResponseSchema,
    })
      .then((wf) => {
        loadGraph(wf.graph as unknown as WorkflowGraphDTO);
        setWorkflowName(wf.name);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [workflowId, getToken, loadGraph]);

  useEffect(() => {
    const openPalette = () => setPaletteOpen(true);
    window.addEventListener("flowpilot:open-palette", openPalette);
    return () =>
      window.removeEventListener("flowpilot:open-palette", openPalette);
  }, []);

  if (loading) {
    return (
      <div
        data-testid="workflow-editor-loading"
        className="flex flex-1 items-center justify-center bg-[var(--bg)] text-sm text-[var(--text-muted)]"
      >
        Loading workflow…
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="workflow-editor-error"
        className="flex flex-1 items-center justify-center bg-[var(--bg)] text-sm text-[var(--danger)]"
      >
        {error}
      </div>
    );
  }

  return (
    <div
      data-testid="workflow-editor"
      className="flex flex-1 flex-col overflow-hidden bg-[var(--bg)]"
    >
      <header
        data-testid="workflow-editor-header"
        className="shrink-0 border-b border-[var(--border)] bg-[var(--panel)] px-3 pt-2.5"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            data-testid="workflow-back"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Back to workflows"
          >
            <BackIcon />
          </Link>
          <div
            data-testid="workflow-title-pill"
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 shadow-[var(--shadow-soft)]"
          >
            <input
              data-testid="workflow-name-input"
              value={workflowName}
              onChange={(e) => handleRename(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[var(--text)] outline-none"
            />
            <span
              aria-hidden
              className="shrink-0 text-[var(--text-muted)] opacity-60"
              data-testid="workflow-title-edit-affordance"
            >
              <PencilIcon />
            </span>
            <SaveIndicator status={saveStatus} />
          </div>
          <CreditsChrome
            estimateM={credits.estimateM}
            balanceM={credits.balanceM}
            insufficient={credits.insufficient}
            loading={credits.loading}
          />
          {tab === "workflow" ? (
            <button
              type="button"
              data-testid="workflow-play"
              disabled={runCtx?.isBusy}
              onClick={() => void handlePlay()}
              aria-label="Play workflow"
              className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent-play)] text-white shadow-[var(--shadow-soft)] disabled:opacity-60"
            >
              <PlayIcon />
            </button>
          ) : null}
          <button
            type="button"
            data-testid="history-toggle"
            aria-label={historyOpen ? "Hide history" : "Show history"}
            aria-pressed={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
            className={
              historyOpen
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-[var(--shadow-soft)]"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--panel)] text-[var(--text-muted)] shadow-[var(--shadow-soft)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
            }
          >
            <HistoryClockIcon />
          </button>
        </div>
        <nav
          data-testid="workflow-tabs"
          className="mt-2 flex gap-6"
          aria-label="Editor views"
        >
          {(
            [
              ["playground", "Playground"],
              ["api", "API"],
              ["workflow", "Workflow"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`workflow-tab-${id}`}
              data-active={tab === id ? "true" : "false"}
              onClick={() => setTab(id)}
              className={
                tab === id
                  ? "border-b-2 border-[var(--text)] pb-2 text-sm font-medium text-[var(--text)]"
                  : "border-b-2 border-transparent pb-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              }
            >
              {label}
            </button>
          ))}
        </nav>
        <RunStatusBanner />
      </header>

      {tab === "workflow" ? (
        <div className="relative flex flex-1 overflow-hidden">
          <div className="relative min-w-0 flex-1">
            <WorkflowCanvas onOpenPalette={() => setPaletteOpen(true)} />
            <NodePalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
            />
          </div>
          {historyOpen ? <HistorySidebar workflowId={workflowId} /> : null}
        </div>
      ) : null}

      {tab === "playground" ? <PlaygroundPlaceholder /> : null}
      {tab === "api" ? <ApiPlaceholder /> : null}
    </div>
  );
}

function PlaygroundPlaceholder() {
  return (
    <div
      data-testid="playground-panel"
      className="flex flex-1 overflow-hidden bg-[var(--bg)]"
    >
      <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--panel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">Inputs</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Playground inputs will appear here when runs are wired (doc 05/10).
        </p>
      </aside>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2">
          <button
            type="button"
            disabled
            className="rounded-md bg-[var(--accent-primary-cta)] px-4 py-1.5 text-sm font-medium text-white opacity-60"
          >
            Run
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Output</h2>
          <p className="text-sm text-[var(--text-muted)]">No output yet</p>
        </div>
      </div>
    </div>
  );
}

function ApiPlaceholder() {
  return (
    <div
      data-testid="api-panel"
      className="flex flex-1 overflow-auto bg-[var(--bg)] p-6"
    >
      <div className="mx-auto w-full max-w-2xl rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">API</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Call this workflow via the public API. Docs and keys land with later
          slices — structure only for now.
        </p>
        <pre className="overflow-x-auto rounded-[var(--field-radius)] bg-[var(--bg)] p-4 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text)]">
{`POST /api/v1/workflows/{id}/run
Authorization: Bearer <token>

{ "inputs": { ... } }`}
        </pre>
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const label =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save error";
  return (
    <span
      data-testid="save-indicator"
      data-status={status}
      className="shrink-0 text-xs text-[var(--text-muted)]"
    >
      {label}
    </span>
  );
}

function RunStatusBanner() {
  const runCtx = useWorkflowRun();
  if (!runCtx) return null;
  const { status } = runCtx;
  if (status.kind === "idle") return null;

  if (status.kind === "starting") {
    return (
      <p
        data-testid="run-status"
        data-kind="starting"
        className="mt-2 pb-2 text-xs text-[var(--text-muted)]"
      >
        Starting run…
      </p>
    );
  }

  if (status.kind === "started") {
    return (
      <p
        data-testid="run-status"
        data-kind="started"
        data-run-id={status.runId}
        className="mt-2 pb-2 text-xs text-[var(--success)]"
      >
        {status.message}
      </p>
    );
  }

  const isCredits = status.code === "insufficient_credits";

  return (
    <div
      data-testid="run-status"
      data-kind="error"
      data-code={status.code ?? "error"}
      role="alert"
      className={
        isCredits
          ? "mt-2 mb-1 flex items-start justify-between gap-3 rounded-md border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,white)] px-3 py-2 text-xs text-[var(--danger)]"
          : "mt-2 pb-2 text-xs text-[var(--danger)]"
      }
    >
      <p data-testid="run-status-message" className="min-w-0 flex-1">
        {isCredits ? (
          <>
            <span className="font-semibold">Insufficient credits. </span>
            {status.message.replace(/^Insufficient credits:\s*/i, "")}
          </>
        ) : (
          status.message
        )}
      </p>
      {isCredits ? (
        <button
          type="button"
          data-testid="run-status-dismiss"
          onClick={runCtx.clearStatus}
          className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M8.5 3L4.5 7L8.5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M4 2.5v9l8-4.5L4 2.5Z" fill="currentColor" />
    </svg>
  );
}

function HistoryClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M8 5v3.2L10 10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 4.5A6.5 6.5 0 0 1 8 2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
