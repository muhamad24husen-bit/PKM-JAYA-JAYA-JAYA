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
