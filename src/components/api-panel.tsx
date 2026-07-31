"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "@/store/editor-store";

function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "https://api.example.com";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function requestValuesSnippet(
  nodes: ReturnType<typeof useEditorStore.getState>["nodes"],
): string {
  const blocks: string[] = [];
  for (const node of nodes) {
    if (node.type !== "request") continue;
    const raw = (node.data as { dynamicFields?: unknown }).dynamicFields;
    if (!Array.isArray(raw) || raw.length === 0) {
      blocks.push(`    "${node.id}": {}`);
      continue;
    }
    const fields = raw
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => {
        const name = typeof f.name === "string" ? f.name : "field";
        return `      "${name}": "your text here"`;
      })
      .join(",\n");
    blocks.push(`    "${node.id}": {\n${fields}\n    }`);
  }
  if (blocks.length === 0) {
    return `    "node_request": {\n      "input": "your text here"\n    }`;
  }
  return blocks.join(",\n");
}

export function buildPythonSample(workflowId: string, valuesBody: string): string {
  const base = apiOrigin();
  return `import requests
import time
import json

api_key = "YOUR_API_KEY"
url = "${base}/api/v1/runs"

data = {
  "workflowId": "${workflowId}",
  "values": {
${valuesBody}
  }
}

def poll_for_result(run_id):
    """Poll the API until the generation is complete"""
    poll_url = f"${base}/api/v1/runs/{run_id}?inDetails=false"
    while True:
        response = requests.get(poll_url, headers={'Authorization': f'Bearer {api_key}'})
        result = response.json()
        if result['status'] == 'COMPLETED':
            return result
        elif result['status'] in ['FAILED', 'CANCELED']:
            raise Exception(f"Run failed: {result.get('error')}")
        time.sleep(7)

response = requests.post(url, json=data, headers={'Authorization': f'Bearer {api_key}'})
run_id = response.json()['runId']
result = poll_for_result(run_id)
print(json.dumps(result, indent=2))
`;
}

const SAMPLE_DETAIL_RESPONSE = `{
  "id": "run_abc123...",
  "workflowId": "cmm4kbhf...",
  "workflowName": "My Workflow",
  "status": "COMPLETED",
  "mode": "full",
  "startedAt": "2025-01-01T00:00:00.000Z",
  "finishedAt": "2025-01-01T00:00:42.000Z",
  "creditsUsed": 1.72,
  "nodeRuns": [
    {
      "id": "nr_req123...",
      "nodeId": "node_request...",
      "nodeType": "request",
      "status": "COMPLETED",
      "startedAt": "2025-01-01T00:00:00.000Z",
      "finishedAt": "2025-01-01T00:00:01.000Z",
      "error": null,
      "input": null,
      "output": {
        "fields": { "Car prompt": "a horse running in fields" }
      }
    },
    {
      "id": "nr_proc123...",
      "nodeId": "node_proc...",
      "nodeType": "flux_pro",
      "status": "COMPLETED",
      "startedAt": "2025-01-01T00:00:01.000Z",
      "finishedAt": "2025-01-01T00:00:11.000Z",
      "error": null,
      "input": { "prompt": "a horse running in fields" },
      "output": {
        "result": "https://cdn.example.com/output.png"
      }
    },
    {
      "id": "nr_resp123...",
      "nodeId": "node_resp...",
      "nodeType": "response",
      "status": "COMPLETED",
      "startedAt": "2025-01-01T00:00:11.000Z",
      "finishedAt": "2025-01-01T00:00:12.000Z",
      "error": null,
      "input": null,
      "output": {
        "result": "https://cdn.example.com/output.png"
      }
    }
  ]
}`;

const WEBHOOK_SNIPPET = `{
  "webhook": {
    "url": "https://your-server.com/webhook",
    "events": [
      "run.completed",
      "run.failed"
    ]
  }
}`;

export function ApiPanel({ workflowId }: { workflowId: string }) {
  const nodes = useEditorStore((s) => s.nodes);
  const [copied, setCopied] = useState(false);
  const [inDetails, setInDetails] = useState(true);

  const valuesBody = useMemo(() => requestValuesSnippet(nodes), [nodes]);
  const python = useMemo(
    () => buildPythonSample(workflowId, valuesBody),
    [workflowId, valuesBody],
  );
  const base = apiOrigin();
  const postUrl = `${base}/api/v1/runs`;
  const pollPath = inDetails
    ? "/v1/runs/{runId}?inDetails=true"
    : "/v1/runs/{runId}?inDetails=false";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(python);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard failures in tests / insecure ctx */
    }
  };

  return (
    <div
      data-testid="api-panel"
      className="flex min-h-0 flex-1 overflow-auto bg-[var(--bg)] p-3"
    >
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-3 lg:grid-cols-2">
        <section
          data-testid="api-code-panel"
          className="flex min-h-[520px] flex-col overflow-hidden rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <button
              type="button"
              data-testid="api-lang"
              className="flex items-center gap-1 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--text)]"
            >
              Python
              <ChevronIcon />
            </button>
            <button
              type="button"
              data-testid="api-copy"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1.5 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <CopyIcon />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            data-testid="api-python-sample"
            className="min-h-0 flex-1 overflow-auto bg-[var(--bg)] p-4 font-[family-name:var(--font-geist-mono)] text-[12px] leading-5 text-[var(--text)]"
          >
            <code className="font-[family-name:var(--font-geist-mono)]">
              {python}
            </code>
          </pre>
        </section>

        <section
          data-testid="api-docs-panel"
          className="flex flex-col gap-5 overflow-auto rounded-[var(--node-radius)] border border-[var(--border)] bg-[var(--panel)] p-4"
        >
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--text)]">
              API Endpoint
            </h3>
            <div
              data-testid="api-endpoint-post"
              className="flex items-center gap-2 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text)]"
            >
              <span className="rounded bg-[color-mix(in_srgb,var(--success)_18%,white)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--success)]">
                POST
              </span>
              <span className="truncate">{postUrl}</span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--text)]">
              Response Format
            </h3>
            <p className="mb-2 text-xs leading-5 text-[var(--text-muted)]">
              The start endpoint returns a{" "}
              <code className="rounded bg-[var(--bg)] px-1 font-[family-name:var(--font-geist-mono)] text-[var(--text)]">
                runId
              </code>
              . Poll{" "}
              <code className="rounded bg-[var(--bg)] px-1 font-[family-name:var(--font-geist-mono)] text-[var(--text)]">
                GET /v1/runs/{"{runId}"}
              </code>{" "}
              to check status.
            </p>
            <pre className="overflow-x-auto rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--text)]">
              {`{\n  "runId": "run_abc123..."\n}`}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--text)]">
              Polling Format
            </h3>
            <p className="mb-2 text-xs leading-5 text-[var(--text-muted)]">
              Poll{" "}
              <code className="rounded bg-[var(--bg)] px-1 font-[family-name:var(--font-geist-mono)] text-[var(--text)]">
                GET /v1/runs/{"{runId}"}
              </code>{" "}
              until status is a terminal value:
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <StatusPill tone="muted">Queued</StatusPill>
              <StatusPill tone="muted">Running</StatusPill>
              <StatusPill tone="success">Completed</StatusPill>
              <StatusPill tone="danger">Canceled</StatusPill>
              <StatusPill tone="danger">Failed</StatusPill>
            </div>
            <div
              data-testid="api-endpoint-get"
              className="mb-3 flex items-center gap-2 rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text)]"
            >
              <span className="rounded bg-[color-mix(in_srgb,var(--port-image)_18%,white)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--port-image)]">
                GET
              </span>
              <span className="truncate">{pollPath}</span>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--text)]">
                inDetails
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={inDetails}
                data-testid="api-indetails-toggle"
                onClick={() => setInDetails((v) => !v)}
                className={
                  inDetails
                    ? "relative h-5 w-9 rounded-full bg-[var(--text)]"
                    : "relative h-5 w-9 rounded-full bg-[var(--border)]"
                }
              >
                <span
                  className={
                    inDetails
                      ? "absolute top-0.5 left-[18px] h-4 w-4 rounded-full bg-white"
                      : "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white"
                  }
                />
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                {inDetails ? "true - all node runs" : "false - run only"}
              </span>
            </div>
            <p className="mb-2 text-xs font-medium text-[var(--text)]">
              Sample response:
            </p>
            <pre
              data-testid="api-sample-response"
              className="max-h-64 overflow-auto rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--font-geist-mono)] text-[11px] leading-4 text-[var(--text)]"
            >
              {SAMPLE_DETAIL_RESPONSE}
            </pre>
          </div>

          <div data-testid="api-webhooks">
            <h3 className="mb-1 text-[13px] font-semibold text-[var(--text)]">
              Webhooks (Optional)
            </h3>
            <p className="mb-2 text-xs leading-5 text-[var(--text-muted)]">
              Add a{" "}
              <code className="rounded bg-[var(--bg)] px-1 font-[family-name:var(--font-geist-mono)] text-[var(--text)]">
                webhook
              </code>{" "}
              object to receive notifications when the run completes.
            </p>
            <pre
              data-testid="api-webhooks-snippet"
              className="overflow-x-auto rounded-[var(--field-radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-[family-name:var(--font-geist-mono)] text-[12px] leading-5 text-[var(--text)]"
            >
              {WEBHOOK_SNIPPET}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: string;
  tone: "muted" | "success" | "danger";
}) {
  const cls =
    tone === "success"
      ? "rounded-full border border-[color-mix(in_srgb,var(--success)_40%,var(--border))] px-2 py-0.5 text-[11px] font-medium text-[var(--success)]"
      : tone === "danger"
        ? "rounded-full border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] px-2 py-0.5 text-[11px] font-medium text-[var(--danger)]"
        : "rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]";
  return <span className={cls}>{children}</span>;
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2.5 3.5L5 6.5L7.5 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M2 8V3a1 1 0 0 1 1-1h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
