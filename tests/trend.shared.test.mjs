import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_WINDOW_MS,
  HOUR_MS,
  MINUTE_MS,
  TREND_WINDOWS,
  DEFAULT_TREND_WINDOW,
  buildTrendSeries,
  computeBaseline,
  describeCoverage,
  mergeRollupSample,
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

test("buildTrendSeries 3m: sampel mentah difilter, diurutkan, dirata-rata", () => {
  const now = T0 + 10 * MINUTE_MS;
  const history = [
    { timestamp: iso(now - 30 * 1000), rso2: 70 },
    { timestamp: iso(now - 60 * 1000), rso2: 68 },
    { timestamp: iso(now - 200 * 1000), rso2: 60 }, // di luar 180 detik
    { timestamp: "rusak", rso2: 65 },
    { timestamp: iso(now - 10 * 1000), rso2: "bukan-angka" },
  ];
  const series = buildTrendSeries({ windowKey: "3m", history, rollup: null, now });
  assert.deepEqual(series.points.map((p) => p.rso2), [68, 70]);
  assert.ok(series.points[0].t < series.points[1].t);
  assert.equal(series.average, 69);
  assert.equal(series.windowDef.key, "3m");
});

test("buildTrendSeries 24h: tumbling bucket 30 menit dengan rata-rata berbobot", () => {
  const now = T0 + 2 * 60 * MINUTE_MS;
  const rollup = {
    sessionStartedAt: iso(T0),
    buckets: [
      minuteBucket(T0, 60, 60),
      minuteBucket(T0 + 10 * MINUTE_MS, 66, 30),
      minuteBucket(T0 + 35 * MINUTE_MS, 70, 60),
      minuteBucket(T0 + 40 * MINUTE_MS, 74, 20),
    ],
  };
  const series = buildTrendSeries({ windowKey: "24h", history: [], rollup, now });
  assert.equal(series.points.length, 2);
  assert.equal(series.points[0].rso2, 62); // (60*60 + 66*30) / 90
  assert.equal(series.points[1].rso2, 71); // (70*60 + 74*20) / 80
  assert.equal(series.average, Number(((60 * 60 + 66 * 30 + 70 * 60 + 74 * 20) / 170).toFixed(1)));
  assert.ok(series.baseline); // sesi mulai T0, sudah > 10 menit
});

test("buildTrendSeries 1h: moving average 5 menit digeser per menit", () => {
  const now = T0 + 2 * MINUTE_MS;
  const rollup = {
    sessionStartedAt: iso(T0),
    buckets: [minuteBucket(T0, 60, 60), minuteBucket(T0 + MINUTE_MS, 62, 60)],
  };
  const series = buildTrendSeries({ windowKey: "1h", history: [], rollup, now });
  // Titik pada menit T0 (hanya bucket T0), T0+1 dan T0+2 (gabungan trailing 5 menit).
  assert.deepEqual(series.points.map((p) => p.rso2), [60, 61, 61]);
  assert.equal(series.baseline, null); // baru 2 menit — baseline belum terbentuk
});

test("buildTrendSeries: jendela kosong dan coverage parsial", () => {
  const empty = buildTrendSeries({ windowKey: "72h", history: [], rollup: null, now: T0 });
  assert.deepEqual(empty.points, []);
  assert.equal(empty.average, null);
  assert.equal(empty.coverageMs, 0);

  const now = T0 + 2 * 60 * MINUTE_MS;
  const rollup = { sessionStartedAt: iso(T0), buckets: [minuteBucket(T0, 60, 60), minuteBucket(T0 + 90 * MINUTE_MS, 64, 60)] };
  const partial = buildTrendSeries({ windowKey: "24h", history: [], rollup, now });
  assert.ok(partial.coverageMs < partial.windowMs);
  assert.ok(partial.coverageMs >= 2 * 60 * MINUTE_MS - MINUTE_MS);
});

test("mergeRollupSample: null rollup menjadi rollup baru dengan sesi", () => {
  const item = { timestamp: iso(T0 + 30 * 1000), rso2: 66 };
  const merged = mergeRollupSample(null, item, T0 + 30 * 1000);
  assert.equal(merged.sessionStartedAt, iso(T0 + 30 * 1000));
  assert.deepEqual(merged.buckets, [{ t: iso(T0), avg: 66, count: 1 }]);
});

test("mergeRollupSample: bucket menit yang sama di-update berbobot", () => {
  const start = { sessionStartedAt: iso(T0), buckets: [{ t: iso(T0), avg: 60, count: 2 }] };
  const merged = mergeRollupSample(start, { timestamp: iso(T0 + 10 * 1000), rso2: 69 }, T0 + 10 * 1000);
  assert.deepEqual(merged.buckets, [{ t: iso(T0), avg: 63, count: 3 }]); // (60*2 + 69) / 3
  assert.deepEqual(start.buckets, [{ t: iso(T0), avg: 60, count: 2 }]); // input tidak dimutasi
});

test("mergeRollupSample: rso2 tidak numerik diabaikan, sesi tidak berubah", () => {
  const start = { sessionStartedAt: iso(T0), buckets: [] };
  const merged = mergeRollupSample(start, { timestamp: iso(T0), rso2: "x" }, T0);
  assert.deepEqual(merged, start);
});

test("describeCoverage memakai satuan menit untuk jendela pendek dan jam untuk panjang", () => {
  assert.equal(describeCoverage(42 * MINUTE_MS, HOUR_MS), "Data baru mencakup ~42 dari 60 menit.");
  assert.equal(describeCoverage(2 * HOUR_MS, 24 * HOUR_MS), "Data baru mencakup ~2 dari 24 jam.");
});
