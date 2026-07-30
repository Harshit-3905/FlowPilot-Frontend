import { expect, test } from "@playwright/test";
import { apiBaseUrl, feBaseUrl, originOf } from "./helpers/env";

/**
 * Optional CORS smoke: browser-origin request from FE to API health.
 * Soft-skips when API is unreachable (no local BE / CI without dual deploy).
 */
test.describe("CORS smoke (optional)", () => {
  test("page can fetch API_BASE_URL /api/v1/health with FE Origin", async ({
    page,
  }) => {
    const fe = feBaseUrl();
    const api = apiBaseUrl();

    // Land on FE origin so subsequent fetch is cross-origin from a real page.
    const feReachable = await page
      .goto(fe, { waitUntil: "domcontentloaded", timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!feReachable, `FE not reachable at ${fe}`);

    const result = await page.evaluate(async (apiOrigin) => {
      try {
        const res = await fetch(`${apiOrigin}/api/v1/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        const acao = res.headers.get("access-control-allow-origin");
        const body = await res.json().catch(() => null);
        return {
          ok: res.ok,
          status: res.status,
          acao,
          body,
          error: null as string | null,
        };
      } catch (err) {
        return {
          ok: false,
          status: 0,
          acao: null as string | null,
          body: null,
          error: String(err),
        };
      }
    }, api);

    if (result.error || result.status === 0) {
      test.skip(true, `API not reachable at ${api}: ${result.error ?? "network"}`);
    }

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "ok" });
    // CORS must allow this FE origin (or *). Missing ACAO means browser would block.
    if (result.acao) {
      expect([originOf(fe), "*"]).toContain(result.acao);
    }
  });
});
