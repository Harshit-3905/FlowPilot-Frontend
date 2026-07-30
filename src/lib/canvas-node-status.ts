import type { RunStatus } from "@/contracts";

/** Canvas chrome status: idle until a live run touches the node. */
export type CanvasNodeStatus = "idle" | RunStatus;

export type CanvasNodeStatusChrome = {
  /** Value for `data-status` on the node root. */
  dataStatus: CanvasNodeStatus;
  /** Extra classes on the node card root (border + running pulse). */
  rootClassName: string;
  /** Extra classes on the header row. */
  headerClassName: string;
  /** Badge classes; empty string when no badge (idle). */
  badgeClassName: string;
  /** Whether to render a status badge in the header. */
  showBadge: boolean;
};

const BASE_BADGE =
  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

/**
 * Map live run status → Magica-token chrome classes for FlowNode.
 * Running is visually distinct (accent border + pulse); completed/failed use success/danger.
 */
export function canvasNodeStatusChrome(
  status: CanvasNodeStatus,
): CanvasNodeStatusChrome {
  switch (status) {
    case "running":
      return {
        dataStatus: "running",
        rootClassName:
          "border-[var(--accent-play)] flow-node--status-running",
        headerClassName:
          "border-[color-mix(in_srgb,var(--accent-play)_35%,var(--border))] bg-[color-mix(in_srgb,var(--accent-play)_10%,white)]",
        badgeClassName: `${BASE_BADGE} bg-[color-mix(in_srgb,var(--accent-play)_14%,white)] text-[var(--accent-play)]`,
        showBadge: true,
      };
    case "completed":
      return {
        dataStatus: "completed",
        rootClassName: "border-[var(--success)]",
        headerClassName:
          "border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,white)]",
        badgeClassName: `${BASE_BADGE} bg-[color-mix(in_srgb,var(--success)_18%,white)] text-[var(--success)]`,
        showBadge: true,
      };
    case "failed":
      return {
        dataStatus: "failed",
        rootClassName: "border-[var(--danger)]",
        headerClassName:
          "border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,white)]",
        badgeClassName: `${BASE_BADGE} bg-[color-mix(in_srgb,var(--danger)_14%,white)] text-[var(--danger)]`,
        showBadge: true,
      };
    case "queued":
      return {
        dataStatus: "queued",
        rootClassName: "border-[var(--border)]",
        headerClassName: "border-[var(--border)]",
        badgeClassName: `${BASE_BADGE} bg-[var(--bg)] text-[var(--text-muted)]`,
        showBadge: true,
      };
    case "cancelled":
      return {
        dataStatus: "cancelled",
        rootClassName: "border-[var(--border)]",
        headerClassName: "border-[var(--border)]",
        badgeClassName: `${BASE_BADGE} bg-[var(--bg)] text-[var(--text-muted)]`,
        showBadge: true,
      };
    case "idle":
    default:
      return {
        dataStatus: "idle",
        rootClassName: "border-[var(--border)]",
        headerClassName: "border-[var(--border)]",
        badgeClassName: "",
        showBadge: false,
      };
  }
}
