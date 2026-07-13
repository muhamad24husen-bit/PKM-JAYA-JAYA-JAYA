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
