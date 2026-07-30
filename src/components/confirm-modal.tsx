"use client";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive action styling (delete / revoke). */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
};

/**
 * In-app confirm dialog — replaces `window.confirm`.
 * Matches the api-keys created-key modal chrome.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
  testId = "confirm-modal",
}: ConfirmModalProps) {
  if (!open) return null;

  const titleId = `${testId}-title`;

  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md border border-[var(--border)] bg-[var(--panel)] p-6 shadow-lg">
        <h2
          id={titleId}
          className="mb-2 text-lg font-semibold text-[var(--text)]"
        >
          {title}
        </h2>
        <p className="mb-6 text-sm text-[var(--text-muted)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-testid={`${testId}-cancel`}
            disabled={busy}
            onClick={onCancel}
            className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid={`${testId}-confirm`}
            disabled={busy}
            onClick={onConfirm}
            className={
              danger
                ? "rounded-md bg-[var(--danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                : "rounded-md bg-[var(--text)] px-4 py-2 text-sm font-medium text-[var(--panel)] hover:opacity-80 disabled:opacity-50"
            }
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
