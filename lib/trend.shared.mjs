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
