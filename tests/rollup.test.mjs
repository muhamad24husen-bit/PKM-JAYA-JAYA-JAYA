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
