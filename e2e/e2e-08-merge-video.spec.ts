import { test } from "@playwright/test";
import { wantsFfmpegE2E } from "./helpers/env";

/**
 * E2E-08: Merge Video — real concat output URL.
 *
 * Primary automated coverage is **backend** FFmpeg integration:
 * `backend/src/providers/merge-videos.test.ts`
 * (`describe.skipIf(!isFfmpegAvailable())`).
 *
 * L4 Playwright path is not required for doc 12 Done: set `E2E_FFMPEG=1`
 * only if extending with a live dual-deploy merge workflow (not wired here).
 * See `docs/integration-coverage.md`.
 */
test.describe("E2E-08 Merge Video", () => {
  test("covered by BE ffmpeg integration (L4 opt-in deferred)", () => {
    test.skip(
      !wantsFfmpegE2E(),
      "E2E-08: BE coverage = merge-videos.test.ts (skipIf no ffmpeg). Set E2E_FFMPEG=1 only when wiring a live L4 merge path.",
    );
    // Flag set but no live FE/API merge harness yet — still skip (does not fail CI).
    test.skip(
      true,
      "E2E_FFMPEG=1 set, but L4 live merge harness is deferred; use BE merge-videos.test.ts.",
    );
  });
});
