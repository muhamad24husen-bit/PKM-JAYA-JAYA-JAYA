# rSO₂ Time-Window Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed hourly rSO₂ chart on the Dashboard with a layered time-window dropdown (3 Menit / 1 Jam / 6 Jam / 24 Jam default / 72 Jam) backed by a persistent per-minute rollup on the backend, with a session baseline reference line and honest partial/empty states.

**Architecture:** Pure aggregation logic lives in `lib/trend.shared.mjs` (imported by both frontend and backend, mirroring the existing `telemetry.shared.mjs` pattern). The backend keeps a per-minute `{sum,count}` rollup store (`server/rollup.mjs`) persisted to JSON with 72h retention, exposed via `GET /api/telemetry/rollup`. The frontend fetches the rollup once, then keeps it fresh locally by merging each SSE `telemetry` event; the chart component owns the window selection and derives its series with `buildTrendSeries`.

**Tech Stack:** Next.js (JS, no TS), Recharts, Express, node:test (built-in runner), no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-07-13-rso2-time-window-dropdown-design.md`

## Global Constraints

- **No new npm dependencies.** Tests use Node's built-in `node --test`.
- All UI copy in Indonesian; exact strings: empty state `Belum ada data untuk jendela ini.`, coverage note `Data baru mencakup ~X dari Y <menit|jam>.`
- Use the light clinical-minimal theme tokens (`nirwana-border`, `nirwana-muted`, `nirwana-text`, `nirwana-accent`); no dark/glow styling.
- `HISTORY_LIMIT` (500) and the existing SSE contract are untouched — **no new SSE events**.
- Default dropdown window is `24h`. Baseline window is the first 10 minutes of the session.
- Shared-module pattern: logic in `lib/trend.shared.mjs`, `lib/trend.js` only re-exports (same as `lib/telemetry.js`).
- Timestamps: bucket keys are epoch-ms minute starts (`Math.floor(ms/60000)*60000`); wire format for bucket `t` is ISO string. Labels use **local time**.
- Rollup payload shape everywhere: `{ sessionStartedAt: string|null, baseline: {value,from,to}|null, buckets: [{ t: string, avg: number, count: number }] }` (frontend state keeps only `sessionStartedAt` + `buckets`).
- Windows PowerShell for commands; repo root is the working directory.

---

### Task 1: Trend window constants + `computeBaseline` + test script

**Files:**
- Create: `lib/trend.shared.mjs`
- Create: `lib/trend.js`
- Create: `tests/trend.shared.test.mjs`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2–7):
  - `MINUTE_MS = 60000`, `BASELINE_WINDOW_MS = 600000`, `ROLLUP_RETENTION_MS = 259200000`
  - `TREND_WINDOWS: Array<{ key, label, subLabel, rangeLabel, windowMs, bucketMs, source: "raw"|"rollup", movingAverage?: true }>`
  - `DEFAULT_TREND_WINDOW = "24h"`
  - `computeBaseline(buckets, sessionStartedAt, now) → { value:number, from:string, to:string } | null` — `buckets` is the wire-format array `[{t, avg, count}]`.

- [ ] **Step 1: Create `lib/trend.shared.mjs` with constants and `computeBaseline`**

```js
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const BASELINE_WINDOW_MS = 10 * MINUTE_MS;
export const ROLLUP_RETENTION_MS = 72 * HOUR_MS;
export const DEFAULT_TREND_WINDOW = "24h";

// Lapisan arsitektur waktu (spec §3). movingAverage: rata-rata bergerak 5 menit digeser per menit.
export const TREND_WINDOWS = [
  {
    key: "3m",
    label: "3 Menit (Live)",
    subLabel: "Data mentah 1 Hz",
    rangeLabel: "3 menit terakhir",
    windowMs: 3 * MINUTE_MS,
    bucketMs: 1000,
    source: "raw",
  },
  {
    key: "1h",
    label: "1 Jam",
    subLabel: "Moving average 5 menit",
    rangeLabel: "1 jam terakhir",
    windowMs: HOUR_MS,
    bucketMs: 5 * MINUTE_MS,
    source: "rollup",
    movingAverage: true,
  },
  {
    key: "6h",
    label: "6 Jam",
    subLabel: "Rata-rata 15 menit",
    rangeLabel: "6 jam terakhir",
    windowMs: 6 * HOUR_MS,
    bucketMs: 15 * MINUTE_MS,
    source: "rollup",
  },
  {
    key: "24h",
    label: "24 Jam",
    subLabel: "Rata-rata 30 menit",
    rangeLabel: "24 jam terakhir",
    windowMs: 24 * HOUR_MS,
    bucketMs: 30 * MINUTE_MS,
    source: "rollup",
  },
  {
    key: "72h",
    label: "72 Jam",
    subLabel: "Rata-rata per jam",
    rangeLabel: "72 jam terakhir",
    windowMs: 72 * HOUR_MS,
    bucketMs: HOUR_MS,
    source: "rollup",
  },
];

const pad2 = (value) => String(value).padStart(2, "0");

export function formatPointLabel(ms, windowKey) {
  const date = new Date(ms);
  if (windowKey === "3m") {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }
  if (windowKey === "72h") {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)} ${pad2(date.getHours())}:00`;
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Baseline = rata-rata berbobot 10 menit pertama sesi; null sebelum jendelanya penuh (spec §4).
export function computeBaseline(buckets, sessionStartedAt, now) {
  if (!sessionStartedAt) return null;
  const sessionStart = Date.parse(sessionStartedAt);
  if (!Number.isFinite(sessionStart)) return null;
  const windowEnd = sessionStart + BASELINE_WINDOW_MS;
  if (now < windowEnd) return null;

  let totalSum = 0;
  let totalCount = 0;
  for (const bucket of buckets || []) {
    const ts = Date.parse(bucket?.t);
    const avg = Number(bucket?.avg);
    const count = Number(bucket?.count);
    if (!Number.isFinite(ts) || !Number.isFinite(avg) || !(count > 0)) continue;
    if (ts < sessionStart || ts >= windowEnd) continue;
    totalSum += avg * count;
    totalCount += count;
  }

  if (totalCount === 0) return null;
  return {
    value: Number((totalSum / totalCount).toFixed(1)),
    from: new Date(sessionStart).toISOString(),
    to: new Date(windowEnd).toISOString(),
  };
}
```

- [ ] **Step 2: Create `lib/trend.js` re-export**

```js
export * from "./trend.shared.mjs";
```

- [ ] **Step 3: Add the test script to `package.json`**

In the `"scripts"` block, after `"lint"`, add:

```json
"test": "node --test tests/"
```

- [ ] **Step 4: Write failing tests in `tests/trend.shared.test.mjs`**

```js
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
```

- [ ] **Step 5: Run tests to verify they pass** (implementation was written first in Step 1, so these should pass immediately; if any fail, fix `trend.shared.mjs` before continuing)

Run: `npm test`
Expected: 4 passing tests, exit code 0.

- [ ] **Step 6: Commit**

```powershell
git add lib/trend.shared.mjs lib/trend.js tests/trend.shared.test.mjs package.json
git commit -m "feat: add trend window constants and computeBaseline"
```

---

### Task 2: `buildTrendSeries` (raw window, tumbling buckets, moving average, coverage)

**Files:**
- Modify: `lib/trend.shared.mjs` (append)
- Modify: `tests/trend.shared.test.mjs` (append)

**Interfaces:**
- Consumes: Task 1 constants + `computeBaseline` + `formatPointLabel`.
- Produces (used by Task 7):
  - `buildTrendSeries({ windowKey, history, rollup, now? }) → { points: [{t:number, label:string, rso2:number}], average: number|null, baseline, coverageMs: number, windowMs: number, windowDef }`
  - `history` is the existing newest-first raw array from `page.js`; `rollup` is `{ sessionStartedAt, buckets }` or `null`.

- [ ] **Step 1: Append failing tests to `tests/trend.shared.test.mjs`**

```js
import { buildTrendSeries } from "../lib/trend.shared.mjs";

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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL — `buildTrendSeries` is not exported.

- [ ] **Step 3: Append the implementation to `lib/trend.shared.mjs`**

```js
const MA_TRAILING_MINUTES = 5;

function windowDefFor(windowKey) {
  return (
    TREND_WINDOWS.find((w) => w.key === windowKey) ||
    TREND_WINDOWS.find((w) => w.key === DEFAULT_TREND_WINDOW)
  );
}

export function buildTrendSeries({ windowKey, history = [], rollup = null, now = Date.now() } = {}) {
  const def = windowDefFor(windowKey);
  const windowStart = now - def.windowMs;
  let points = [];
  let totalSum = 0;
  let totalCount = 0;

  if (def.source === "raw") {
    const samples = [];
    for (const item of history) {
      const value = Number(item?.rso2);
      const ts = Date.parse(item?.timestamp);
      if (!Number.isFinite(value) || !Number.isFinite(ts)) continue;
      if (ts < windowStart || ts > now) continue;
      samples.push({ t: ts, value });
    }
    samples.sort((a, b) => a.t - b.t);
    points = samples.map((sample) => ({
      t: sample.t,
      label: formatPointLabel(sample.t, def.key),
      rso2: Number(sample.value.toFixed(1)),
    }));
    totalSum = samples.reduce((sum, sample) => sum + sample.value, 0);
    totalCount = samples.length;
  } else {
    // Lookback ekstra agar moving average punya data trailing di tepi kiri jendela.
    const lookbackMs = def.movingAverage ? (MA_TRAILING_MINUTES - 1) * MINUTE_MS : 0;
    const minuteBuckets = [];
    for (const bucket of rollup?.buckets || []) {
      const ts = Date.parse(bucket?.t);
      const avg = Number(bucket?.avg);
      const count = Number(bucket?.count);
      if (!Number.isFinite(ts) || !Number.isFinite(avg) || !(count > 0)) continue;
      if (ts < windowStart - lookbackMs || ts > now) continue;
      minuteBuckets.push({ t: ts, sum: avg * count, count });
      if (ts >= windowStart) {
        totalSum += avg * count;
        totalCount += count;
      }
    }
    minuteBuckets.sort((a, b) => a.t - b.t);

    if (def.movingAverage) {
      const byMinute = new Map(minuteBuckets.map((bucket) => [bucket.t, bucket]));
      const firstMinute = Math.ceil(windowStart / MINUTE_MS) * MINUTE_MS;
      const lastMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
      for (let minute = firstMinute; minute <= lastMinute; minute += MINUTE_MS) {
        let sum = 0;
        let count = 0;
        for (let back = 0; back < MA_TRAILING_MINUTES; back += 1) {
          const bucket = byMinute.get(minute - back * MINUTE_MS);
          if (bucket) {
            sum += bucket.sum;
            count += bucket.count;
          }
        }
        if (count > 0) {
          points.push({
            t: minute,
            label: formatPointLabel(minute, def.key),
            rso2: Number((sum / count).toFixed(1)),
          });
        }
      }
    } else {
      const grouped = new Map();
      for (const bucket of minuteBuckets) {
        const key = Math.floor(bucket.t / def.bucketMs) * def.bucketMs;
        const group = grouped.get(key) || { sum: 0, count: 0 };
        group.sum += bucket.sum;
        group.count += bucket.count;
        grouped.set(key, group);
      }
      points = [...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, { sum, count }]) => ({
          t,
          label: formatPointLabel(t, def.key),
          rso2: Number((sum / count).toFixed(1)),
        }));
    }
  }

  const average = totalCount > 0 ? Number((totalSum / totalCount).toFixed(1)) : null;
  const baseline = computeBaseline(rollup?.buckets || [], rollup?.sessionStartedAt || null, now);
  const coverageMs = points.length ? Math.min(now - points[0].t, def.windowMs) : 0;

  return { points, average, baseline, coverageMs, windowMs: def.windowMs, windowDef: def };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass (8 total).

- [ ] **Step 5: Commit**

```powershell
git add lib/trend.shared.mjs tests/trend.shared.test.mjs
git commit -m "feat: add buildTrendSeries window aggregation"
```

---

### Task 3: `mergeRollupSample` + `describeCoverage`

**Files:**
- Modify: `lib/trend.shared.mjs` (append)
- Modify: `tests/trend.shared.test.mjs` (append)

**Interfaces:**
- Consumes: Task 1 constants.
- Produces (used by Tasks 6–7):
  - `mergeRollupSample(rollup|null, item, now?) → { sessionStartedAt, buckets }` (new object; never mutates input)
  - `describeCoverage(coverageMs, windowMs) → string` — e.g. `"Data baru mencakup ~2 dari 24 jam."`

- [ ] **Step 1: Append failing tests to `tests/trend.shared.test.mjs`**

```js
import { mergeRollupSample, describeCoverage, HOUR_MS } from "../lib/trend.shared.mjs";

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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL — `mergeRollupSample` / `describeCoverage` not exported.

- [ ] **Step 3: Append the implementation to `lib/trend.shared.mjs`**

```js
// Update rollup lokal frontend dari satu event SSE `telemetry` (spec §6).
export function mergeRollupSample(rollup, item, now = Date.now()) {
  const base =
    rollup && Array.isArray(rollup.buckets)
      ? rollup
      : { sessionStartedAt: null, buckets: [] };
  const value = Number(item?.rso2);
  if (!Number.isFinite(value)) return base;

  let ts = Date.parse(item?.timestamp);
  if (!Number.isFinite(ts)) ts = now;
  const minuteStart = Math.floor(ts / MINUTE_MS) * MINUTE_MS;
  const minuteIso = new Date(minuteStart).toISOString();

  let found = false;
  const buckets = [];
  for (const bucket of base.buckets) {
    const bucketTs = Date.parse(bucket?.t);
    if (!Number.isFinite(bucketTs) || bucketTs < now - ROLLUP_RETENTION_MS) continue;
    if (bucketTs === minuteStart) {
      const count = Number(bucket.count) || 0;
      const sum = (Number(bucket.avg) || 0) * count + value;
      buckets.push({ t: bucket.t, avg: Number((sum / (count + 1)).toFixed(2)), count: count + 1 });
      found = true;
    } else {
      buckets.push(bucket);
    }
  }
  if (!found) {
    buckets.push({ t: minuteIso, avg: Number(value.toFixed(2)), count: 1 });
  }
  buckets.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));

  return {
    sessionStartedAt: base.sessionStartedAt || new Date(ts).toISOString(),
    buckets,
  };
}

// Keterangan cakupan data parsial (spec §7): menit untuk jendela ≤ 1 jam, jam untuk lainnya.
export function describeCoverage(coverageMs, windowMs) {
  const useMinutes = windowMs <= HOUR_MS;
  const divisor = useMinutes ? MINUTE_MS : HOUR_MS;
  const unit = useMinutes ? "menit" : "jam";
  const covered = Math.max(1, Math.round(coverageMs / divisor));
  const total = Math.round(windowMs / divisor);
  return `Data baru mencakup ~${covered} dari ${total} ${unit}.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass (12 total).

- [ ] **Step 5: Commit**

```powershell
git add lib/trend.shared.mjs tests/trend.shared.test.mjs
git commit -m "feat: add mergeRollupSample and describeCoverage"
```

---

### Task 4: Backend rollup store (`server/rollup.mjs`)

**Files:**
- Create: `server/rollup.mjs`
- Create: `tests/rollup.test.mjs`

**Interfaces:**
- Consumes: `computeBaseline`, `ROLLUP_RETENTION_MS` from `../lib/trend.shared.mjs`.
- Produces (used by Task 5):
  - `createRollupStore({ filePath, retentionMs?, persistDelayMs? }) → { load(), add(item, now?), clear(), snapshot(now?), flush() }`
  - `snapshot()` returns the full wire payload `{ sessionStartedAt, baseline, buckets }`.
  - Persisted file shape: `{ sessionStartedAt, buckets: { "<minuteEpochMs>": { sum, count } } }`.

- [ ] **Step 1: Write failing tests in `tests/rollup.test.mjs`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRollupStore } from "../server/rollup.mjs";
import { BASELINE_WINDOW_MS, MINUTE_MS, ROLLUP_RETENTION_MS } from "../lib/trend.shared.mjs";

// Relatif terhadap waktu nyata (rata menit) karena load() melakukan prune dengan Date.now();
// tanggal tetap akan kedaluwarsa begitu retensi 72 jam terlewati.
const T0 = Math.floor((Date.now() - 2 * 60 * 60 * 1000) / MINUTE_MS) * MINUTE_MS;
const iso = (ms) => new Date(ms).toISOString();

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nirwana-rollup-"));
  return path.join(dir, "rollup.json");
}

test("add + snapshot: bucket menit, sesi, dan baseline terbentuk", () => {
  const store = createRollupStore({ filePath: tempFile() });
  for (let minute = 0; minute < 10; minute += 1) {
    store.add({ timestamp: iso(T0 + minute * MINUTE_MS), rso2: 60 + minute }, T0 + minute * MINUTE_MS);
    store.add({ timestamp: iso(T0 + minute * MINUTE_MS + 1000), rso2: 60 + minute }, T0 + minute * MINUTE_MS + 1000);
  }
  const snap = store.snapshot(T0 + BASELINE_WINDOW_MS + MINUTE_MS);
  assert.equal(snap.sessionStartedAt, iso(T0));
  assert.equal(snap.buckets.length, 10);
  assert.deepEqual(snap.buckets[0], { t: iso(T0), avg: 60, count: 2 });
  assert.equal(snap.baseline.value, 64.5); // rata-rata 60..69
});

test("rso2 non-numerik diabaikan tanpa membuka sesi", () => {
  const store = createRollupStore({ filePath: tempFile() });
  store.add({ timestamp: iso(T0), rso2: "abc" }, T0);
  const snap = store.snapshot(T0);
  assert.equal(snap.sessionStartedAt, null);
  assert.deepEqual(snap.buckets, []);
});

test("bucket lebih tua dari retensi dibuang", () => {
  const store = createRollupStore({ filePath: tempFile() });
  const now = T0 + ROLLUP_RETENTION_MS + 2 * MINUTE_MS;
  store.add({ timestamp: iso(T0), rso2: 50 }, T0);
  store.add({ timestamp: iso(now), rso2: 70 }, now);
  const snap = store.snapshot(now);
  assert.equal(snap.buckets.length, 1);
  assert.equal(snap.buckets[0].avg, 70);
});

test("flush + load memulihkan store dari disk", () => {
  const filePath = tempFile();
  const first = createRollupStore({ filePath });
  first.add({ timestamp: iso(T0), rso2: 66 }, T0);
  first.flush();

  const second = createRollupStore({ filePath });
  second.load();
  const snap = second.snapshot(T0 + MINUTE_MS);
  assert.equal(snap.sessionStartedAt, iso(T0));
  assert.deepEqual(snap.buckets, [{ t: iso(T0), avg: 66, count: 1 }]);
});

test("clear mengosongkan bucket, sesi, dan file", () => {
  const filePath = tempFile();
  const store = createRollupStore({ filePath });
  store.add({ timestamp: iso(T0), rso2: 66 }, T0);
  store.clear();
  const snap = store.snapshot(T0);
  assert.equal(snap.sessionStartedAt, null);
  assert.deepEqual(snap.buckets, []);
  const onDisk = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.equal(onDisk.sessionStartedAt, null);
  assert.deepEqual(onDisk.buckets, {});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `server/rollup.mjs` does not exist.

- [ ] **Step 3: Create `server/rollup.mjs`**

```js
import fs from "node:fs";
import path from "node:path";
import { ROLLUP_RETENTION_MS, MINUTE_MS, computeBaseline } from "../lib/trend.shared.mjs";

// Rollup rata-rata per menit dengan persistensi JSON debounce — pola sama dengan riwayat di mqtt-bridge.
export function createRollupStore({
  filePath,
  retentionMs = ROLLUP_RETENTION_MS,
  persistDelayMs = 1000,
} = {}) {
  let buckets = new Map(); // menitEpochMs -> { sum, count }
  let sessionStartedAt = null;
  let persistTimer = null;

  function prune(now) {
    for (const key of buckets.keys()) {
      if (key < now - retentionMs) buckets.delete(key);
    }
  }

  function write() {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify({ sessionStartedAt, buckets: Object.fromEntries(buckets) }),
      );
    } catch (error) {
      console.warn(`Gagal menyimpan rollup: ${error.message}`);
    }
  }

  function schedulePersist() {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      write();
    }, persistDelayMs);
    persistTimer.unref?.();
  }

  function load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      sessionStartedAt = parsed?.sessionStartedAt || null;
      buckets = new Map();
      for (const [key, value] of Object.entries(parsed?.buckets || {})) {
        const minute = Number(key);
        const sum = Number(value?.sum);
        const count = Number(value?.count);
        if (!Number.isFinite(minute) || !Number.isFinite(sum) || !(count > 0)) continue;
        buckets.set(minute, { sum, count });
      }
      prune(Date.now());
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Gagal memuat rollup: ${error.message}`);
      }
    }
  }

  function add(item, now = Date.now()) {
    const value = Number(item?.rso2);
    if (!Number.isFinite(value)) return;
    let ts = Date.parse(item?.timestamp);
    if (!Number.isFinite(ts)) ts = now;
    if (!sessionStartedAt) sessionStartedAt = new Date(ts).toISOString();

    const minute = Math.floor(ts / MINUTE_MS) * MINUTE_MS;
    const bucket = buckets.get(minute) || { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    buckets.set(minute, bucket);
    prune(now);
    schedulePersist();
  }

  function snapshot(now = Date.now()) {
    prune(now);
    const bucketArray = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([minute, { sum, count }]) => ({
        t: new Date(minute).toISOString(),
        avg: Number((sum / count).toFixed(2)),
        count,
      }));
    return {
      sessionStartedAt,
      baseline: computeBaseline(bucketArray, sessionStartedAt, now),
      buckets: bucketArray,
    };
  }

  function flush() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    write();
  }

  function clear() {
    buckets.clear();
    sessionStartedAt = null;
    flush();
  }

  return { load, add, clear, snapshot, flush };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass (17 total).

- [ ] **Step 5: Commit**

```powershell
git add server/rollup.mjs tests/rollup.test.mjs
git commit -m "feat: add per-minute rollup store with 72h retention"
```

---

### Task 5: Wire rollup into `server/mqtt-bridge.mjs`

**Files:**
- Modify: `server/mqtt-bridge.mjs`

**Interfaces:**
- Consumes: `createRollupStore` from Task 4.
- Produces (used by Task 6): HTTP endpoint `GET /api/telemetry/rollup` returning `snapshot()`; `DELETE /api/telemetry/history` now also clears the rollup.

- [ ] **Step 1: Add import and store creation**

After the existing import block ending with `} from "../lib/telemetry.shared.mjs";`, add:

```js
import { createRollupStore } from "./rollup.mjs";
```

After the `const historyFile = ...` declaration, add:

```js
const rollupFile = process.env.ROLLUP_FILE
  ? path.resolve(process.env.ROLLUP_FILE)
  : path.join(__dirname, "data", "rollup.json");

const rollup = createRollupStore({ filePath: rollupFile });
```

- [ ] **Step 2: Feed telemetry into the rollup**

In `addTelemetry(item)`, after `persistHistory();`, add:

```js
  rollup.add(item);
```

- [ ] **Step 3: Add the endpoint + clear + boot/shutdown wiring**

After the `app.get("/api/telemetry/history", ...)` route, add:

```js
app.get("/api/telemetry/rollup", (_req, res) => {
  res.json(rollup.snapshot());
});
```

In the `app.delete("/api/telemetry/history", ...)` handler, after `flushHistory();`, add:

```js
  rollup.clear();
```

After the `loadHistory();` call near the bottom, add:

```js
rollup.load();
```

In `shutdown()`, after `flushHistory();`, add:

```js
  rollup.flush();
```

- [ ] **Step 4: Verify with a running server**

Stop any running backend first, then:

Run: `npm run backend` (leave running), and in another shell: `curl http://localhost:4000/api/telemetry/rollup`
Expected: `{"sessionStartedAt":null,"baseline":null,"buckets":[]}` (or populated if telemetry has flowed). Also `npm test` still passes and the server boots without errors.

- [ ] **Step 5: Commit**

```powershell
git add server/mqtt-bridge.mjs
git commit -m "feat: expose GET /api/telemetry/rollup and wire rollup lifecycle"
```

---

### Task 6: Frontend rollup state in `app/page.js`

**Files:**
- Modify: `app/page.js`

**Interfaces:**
- Consumes: `mergeRollupSample` from `@/lib/trend`; endpoint from Task 5.
- Produces (used by Task 7): `DashboardView` receives new prop `rollup` (`{ sessionStartedAt, buckets } | null`).

- [ ] **Step 1: Import and state**

Add to imports:

```js
import { mergeRollupSample } from "@/lib/trend";
```

Next to the other `useState` calls (after `const [insight, setInsight] = useState(null);`):

```js
const [rollup, setRollup] = useState(null);
```

- [ ] **Step 2: Fetch rollup on mount**

After the `loadLatestInsight` effect, add a sibling effect:

```js
useEffect(() => {
  let cancelled = false;

  async function loadRollup() {
    try {
      const response = await fetch(buildApiUrl(telemetryApiUrl, "/api/telemetry/rollup"), {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (!cancelled && payload && Array.isArray(payload.buckets)) {
        setRollup({ sessionStartedAt: payload.sessionStartedAt || null, buckets: payload.buckets });
      }
    } catch {
      // Rollup belum tersedia; jendela panjang menampilkan keadaan kosong (spec §7).
    }
  }

  loadRollup();

  return () => {
    cancelled = true;
  };
}, [telemetryApiUrl]);
```

- [ ] **Step 3: Keep rollup fresh from SSE + reset on clear**

In the `stream.addEventListener("telemetry", ...)` handler, after `setHistory(...)`, add:

```js
        setRollup((currentRollup) => mergeRollupSample(currentRollup, item));
```

In the `stream.addEventListener("history-clear", ...)` handler, after `setHistory([]);`, add:

```js
      setRollup({ sessionStartedAt: null, buckets: [] });
```

- [ ] **Step 4: Pass the prop**

In the `<DashboardView ... />` JSX, add `rollup={rollup}`:

```jsx
<DashboardView
  current={displayCurrent}
  connectionStatus={connectionStatus}
  insight={insight}
  history={history}
  rollup={rollup}
/>
```

- [ ] **Step 5: Verify lint passes and commit**

Run: `npm run lint`
Expected: exit 0, no errors.

```powershell
git add app/page.js
git commit -m "feat: fetch and maintain rSO2 minute rollup state on the client"
```

---

### Task 7: `Rso2TrendChart` with dropdown, baseline line, empty/coverage states

**Files:**
- Modify: `components/views/DashboardView.jsx`

**Interfaces:**
- Consumes: `TREND_WINDOWS`, `DEFAULT_TREND_WINDOW`, `buildTrendSeries`, `describeCoverage` from `@/lib/trend`; props `history`, `rollup` from Task 6.
- Produces: final UI. Removes `Rso2HourlyChart`, the `hourlyTrend` memo, and the synthetic fallback generator.

- [ ] **Step 1: Update imports**

Replace the `useMemo` import line with:

```js
import { useMemo, useState } from "react";
```

Add:

```js
import {
  buildTrendSeries,
  describeCoverage,
  DEFAULT_TREND_WINDOW,
  TREND_WINDOWS,
} from "@/lib/trend";
```

- [ ] **Step 2: Replace `Rso2HourlyChart` entirely with `Rso2TrendChart`**

Delete the whole `function Rso2HourlyChart({ data, critical }) { ... }` and put this in its place:

```jsx
function Rso2TrendChart({ history, rollup, critical }) {
  const color = critical ? "#dc2626" : "#0f766e";
  const [windowKey, setWindowKey] = useState(DEFAULT_TREND_WINDOW);
  const series = useMemo(
    () => buildTrendSeries({ windowKey, history, rollup }),
    [windowKey, history, rollup],
  );
  const def = series.windowDef;
  const hasChart = series.points.length >= 2;
  const showCoverage = hasChart && series.coverageMs < series.windowMs * 0.95;
  const averageLabel = Number.isFinite(series.average) ? series.average.toFixed(1) : "-";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">
            Grafik rSO&#8322; Ginjal
          </h3>
          <p className="mt-1 text-xs text-nirwana-muted">
            {def.subLabel} &middot; {def.rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-4">
          <select
            value={windowKey}
            onChange={(event) => setWindowKey(event.target.value)}
            aria-label="Jendela waktu grafik"
            className="rounded-lg border border-nirwana-border bg-white px-2.5 py-1.5 text-xs font-semibold text-nirwana-text focus:outline-none focus:ring-2 focus:ring-nirwana-accent/40"
          >
            {TREND_WINDOWS.map((trendWindow) => (
              <option key={trendWindow.key} value={trendWindow.key}>
                {trendWindow.label}
              </option>
            ))}
          </select>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-nirwana-muted">Rata-rata</p>
            <p className="text-3xl font-semibold leading-none" style={{ color }}>
              {averageLabel}
              <span className="ml-1 text-base text-nirwana-muted">%</span>
            </p>
          </div>
        </div>
      </div>

      {hasChart ? (
        <div className="mt-5 h-[240px] w-full sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.points} margin={{ top: 12, right: 20, bottom: 12, left: 0 }}>
              <defs>
                <linearGradient id="rso2-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e4e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "#e4e7eb" }}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                minTickGap={20}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                width={40}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#14181b", fontSize: 11, fontWeight: 600 }}
                tickFormatter={(value) => `${value}%`}
              />
              {series.baseline ? (
                <ReferenceLine
                  y={series.baseline.value}
                  stroke="#9ca3af"
                  strokeDasharray="6 6"
                  label={{
                    value: `Baseline ${series.baseline.value}%`,
                    position: "insideTopRight",
                    fill: "#6b7280",
                    fontSize: 10,
                  }}
                />
              ) : null}
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e4e7eb", borderRadius: "8px", color: "#14181b" }}
                labelStyle={{ color: "#6b7280" }}
                labelFormatter={(value) => (def.key === "72h" ? value : `Pukul ${value}`)}
                formatter={(value) => {
                  const numericValue = Number(value);
                  return [Number.isFinite(numericValue) ? `${numericValue.toFixed(1)}%` : value, "rSO2 rata-rata"];
                }}
              />
              <Area
                type="monotone"
                dataKey="rso2"
                stroke={color}
                strokeWidth={2.5}
                fill="url(#rso2-trend)"
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                isAnimationActive
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 grid h-[240px] w-full place-items-center rounded-lg border border-dashed border-nirwana-border sm:h-[280px]">
          <p className="text-sm text-nirwana-muted">Belum ada data untuk jendela ini.</p>
        </div>
      )}

      {showCoverage ? (
        <p className="mt-2 text-[11px] text-nirwana-muted">{describeCoverage(series.coverageMs, series.windowMs)}</p>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 3: Slim down `DashboardView`**

Change the signature to:

```js
export function DashboardView({ current, connectionStatus, insight, history = [], rollup = null }) {
```

Delete the entire `const hourlyTrend = useMemo(() => { ... }, [history]);` block (including the synthetic 12-hour fallback generator).

Replace `<Rso2HourlyChart data={hourlyTrend} critical={critical} />` with:

```jsx
<Rso2TrendChart history={history} rollup={rollup} critical={critical} />
```

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: exit 0. (If `useMemo` is now unused in `DashboardView`'s body, it is still used inside `Rso2TrendChart` — the import stays.)

Run: `npm test`
Expected: all tests still pass.

Manual: with frontend + backend running, open `http://localhost:3000` → Dashboard. Expect: dropdown present with 5 options, default "24 Jam"; without telemetry the card shows "Belum ada data untuk jendela ini." (no synthetic curve); "3 Menit (Live)" shows raw points once telemetry flows.

- [ ] **Step 5: Commit**

```powershell
git add components/views/DashboardView.jsx
git commit -m "feat: time-window dropdown with baseline and honest empty states on rSO2 chart"
```

---

### Task 8: Env/docs polish + full verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documented feature; verified working end-to-end.

- [ ] **Step 1: Document `ROLLUP_FILE` in `.env.example`**

Append next to the existing `HISTORY_FILE` entry (keep the file's existing comment style):

```
# Lokasi file persistensi rollup rata-rata per menit (default: server/data/rollup.json)
# ROLLUP_FILE=server/data/rollup.json
```

- [ ] **Step 2: Document the endpoint + feature in `README.md`**

Find the section listing backend endpoints (search for `api/telemetry/history`) and add alongside the existing entries:

```
- `GET /api/telemetry/rollup` — agregat rSO₂ per menit (retensi 72 jam) + baseline sesi, untuk dropdown jendela waktu di Dashboard
```

In the dashboard feature description, add one sentence:

```
Grafik rSO₂ di Dashboard punya dropdown jendela waktu (3 Menit / 1 Jam / 6 Jam / 24 Jam / 72 Jam) dengan garis baseline dari 10 menit pertama sesi.
```

- [ ] **Step 3: Full verification**

- Run: `npm test` → all pass.
- Run: `npm run lint` → exit 0.
- Restart backend, publish a few MQTT test payloads per README's no-hardware instructions, and in the browser verify: (a) each of the 5 windows renders or shows the honest empty state; (b) the coverage note appears for partially-covered windows; (c) "Hapus riwayat" resets the chart and session; (d) page reload keeps rollup data (served from backend).

- [ ] **Step 4: Commit**

```powershell
git add .env.example README.md
git commit -m "docs: document rollup endpoint, ROLLUP_FILE, and time-window dropdown"
```
