import { describe, it, expect } from "vitest";
import { isDataStale, STALE_AFTER_MS } from "@/utils/dataFreshness";

const NOW = Date.parse("2026-10-10T00:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const runAgo = (ms: number) => new Date(NOW - ms).toISOString();

describe("isDataStale", () => {
  it("is not stale when the pipeline ran an hour ago", () => {
    expect(isDataStale(runAgo(HOUR), false, NOW)).toBe(false);
  });

  it("is stale once the last run is older than 36 hours", () => {
    expect(isDataStale(runAgo(STALE_AFTER_MS + HOUR), false, NOW)).toBe(true);
  });

  it("is stale when the backend cannot be reached", () => {
    expect(isDataStale(runAgo(0), true, NOW)).toBe(true);
  });

  it("is stale when no analysis run has ever been recorded", () => {
    expect(isDataStale(null, false, NOW)).toBe(true);
  });
});
