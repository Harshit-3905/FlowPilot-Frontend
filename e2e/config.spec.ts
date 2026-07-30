import { expect, test } from "@playwright/test";
import { apiBaseUrl, feBaseUrl, originOf } from "./helpers/env";

/**
 * Always-on gate: Playwright must use separate FE_BASE_URL and API_BASE_URL
 * (split VPC — no same-origin / in-process monorepo harness).
 */
test.describe("E2E config (always-on)", () => {
  test("FE_BASE_URL and API_BASE_URL are set and different origins", () => {
    const fe = feBaseUrl();
    const api = apiBaseUrl();

    expect(fe, "FE_BASE_URL required").toBeTruthy();
    expect(api, "API_BASE_URL required").toBeTruthy();
    expect(() => new URL(fe)).not.toThrow();
    expect(() => new URL(api)).not.toThrow();
    expect(originOf(fe)).not.toBe(originOf(api));
  });
});
