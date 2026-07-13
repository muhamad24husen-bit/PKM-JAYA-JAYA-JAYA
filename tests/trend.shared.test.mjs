import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_WINDOW_MS,
  MINUTE_MS,
  TREND_WINDOWS,
  DEFAULT_TREND_WINDOW,
  computeBaseline,
} from "../lib/trend.shared.mjs";

// 13 Jul 2026 08:00:00 waktu lokal — semua test memakai waktu lokal agar deterministik.
export const T0 = new Date(2026, 6, 13, 8, 0, 0).getTime();
export const iso = (ms) => new Date(ms).toISOString();
export const minuteBucket = (ms, avg, count) => ({ t: iso(ms), avg, count });

test("TREND_WINDOWS memuat 5 lapisan dengan default 24h", () => {
  assert.deepEqual(
    TREND_WINDOWS.map((w) => w.key),
    ["3m", "1h", "6h", "24h", "72h"],
  );
  assert.equal(DEFAULT_TREND_WINDOW, "24h");
});

test("computeBaseline null sebelum 10 menit berlalu", () => {
  const buckets = [minuteBucket(T0, 60, 60)];
  assert.equal(computeBaseline(buckets, iso(T0), T0 + BASELINE_WINDOW_MS - 1), null);
});

test("computeBaseline rata-rata berbobot setelah jendela penuh", () => {
  const buckets = [
    minuteBucket(T0, 60, 30),
    minuteBucket(T0 + MINUTE_MS, 70, 10),
    minuteBucket(T0 + BASELINE_WINDOW_MS, 99, 60), // di luar jendela baseline
  ];
  const baseline = computeBaseline(buckets, iso(T0), T0 + BASELINE_WINDOW_MS + MINUTE_MS);
  assert.equal(baseline.value, 62.5); // (60*30 + 70*10) / 40
  assert.equal(baseline.from, iso(T0));
  assert.equal(baseline.to, iso(T0 + BASELINE_WINDOW_MS));
});

test("computeBaseline null tanpa sesi atau tanpa bucket di jendela", () => {
  assert.equal(computeBaseline([minuteBucket(T0, 60, 60)], null, T0 + BASELINE_WINDOW_MS), null);
  assert.equal(
    computeBaseline([minuteBucket(T0 + BASELINE_WINDOW_MS, 60, 60)], iso(T0), T0 + BASELINE_WINDOW_MS + 1),
    null,
  );
});
