"use client";

type AssetLinksProps = {
  urls: string[];
  /** Prefix for data-testid, e.g. `run-detail-node-output` → `…-view-0`. */
  testIdPrefix?: string;
};

export function AssetLinks({ urls, testIdPrefix = "asset" }: AssetLinksProps) {
  if (urls.length === 0) return null;

  return (
    <ul
      data-testid={`${testIdPrefix}-assets`}
      className="mt-1 flex flex-col gap-1"
    >
      {urls.map((url, index) => (
        <li
          key={`${url}-${index}`}
          className="flex flex-wrap items-center gap-2 text-[10px]"
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`${testIdPrefix}-view-${index}`}
            className="font-medium text-[var(--accent-play)] underline-offset-2 hover:underline"
          >
            View
          </a>
          <a
            href={url}
            download
            data-testid={`${testIdPrefix}-download-${index}`}
            className="font-medium text-[var(--text)] underline-offset-2 hover:underline"
          >
            Download
          </a>
          <span
            className="truncate text-[var(--text-muted)]"
            title={url}
          >
            {url.replace(/^https?:\/\//, "").slice(0, 48)}
            {url.replace(/^https?:\/\//, "").length > 48 ? "…" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
