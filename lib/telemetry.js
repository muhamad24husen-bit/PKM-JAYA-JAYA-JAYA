export const HISTORY_STORAGE_KEY = "nirwana-ai-history";
export const HISTORY_LIMIT = 20;
export const DEFAULT_DEVICE_ID = "nirwana_001";
export const DEFAULT_TOPIC = "nirwana/telemetry";
export const DEFAULT_BROKER_URL = "ws://localhost:9001";

export function normalizeAlertStatus(value) {
  const status = String(value || "NORMAL").trim().toUpperCase();

  if (["HIPOKSIA", "HYPOXIA", "CRITICAL", "DANGER", "GAWAT"].includes(status)) {
    return "HIPOKSIA";
  }

  if (["WASPADA", "WARNING", "WARN", "ALERT"].includes(status)) {
    return "WASPADA";
  }

  return "NORMAL";
}

export function normalizeMotion(value) {
  if (typeof value === "boolean") {
    return value ? "TERDETEKSI" : "STABIL";
  }

  const motion = String(value ?? "").trim();
  return motion || "-";
}

export function toDisplayValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `${value}${suffix}`;
}

export function toNumericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function deriveRatio(red, ir, ratio) {
  const explicitRatio = Number(ratio);
  if (Number.isFinite(explicitRatio)) {
    return Number(explicitRatio.toFixed(3));
  }

  const redNumber = Number(red);
  const irNumber = Number(ir);
  if (!Number.isFinite(redNumber) || !Number.isFinite(irNumber) || irNumber === 0) {
    return null;
  }

  return Number((redNumber / irNumber).toFixed(3));
}

export function normalizeTelemetry(payload) {
  const timestamp = payload.timestamp || payload.time || new Date().toISOString();
  const red = toNumericValue(payload.red ?? payload.redRaw ?? payload.RED);
  const ir = toNumericValue(payload.ir ?? payload.irRaw ?? payload.IR);
  const rso2 = toNumericValue(payload.rso2 ?? payload.rSO2 ?? payload["rso2"] ?? payload["rSO2"]);
  const sqi = toNumericValue(payload.sqi ?? payload.SQI);
  const battery = toNumericValue(payload.battery ?? payload.batteryPercentage);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp,
    deviceId: payload.deviceId || payload.device_id || DEFAULT_DEVICE_ID,
    rso2,
    red,
    ir,
    ratio: deriveRatio(red, ir, payload.ratio ?? payload.redIrRatio),
    motion: normalizeMotion(payload.motion ?? payload.motionStatus),
    sqi,
    battery,
    alertStatus: normalizeAlertStatus(payload.alertStatus ?? payload.status ?? payload.alert),
  };
}

export function parseTelemetryMessage(message) {
  const text = typeof message === "string" ? message : new TextDecoder().decode(message);
  const payload = JSON.parse(text);

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Payload MQTT harus berupa objek JSON.");
  }

  return normalizeTelemetry(payload);
}

export function createDemoTelemetry(index = 0) {
  const phase = index * 0.42;
  const rso2 = Number((68 + Math.sin(phase) * 8 + Math.sin(phase * 0.37) * 3).toFixed(2));
  const red = Math.round(52000 + Math.sin(phase * 1.65) * 7200 + Math.cos(phase * 0.48) * 1800);
  const ir = Math.round(68000 + Math.sin(phase * 1.45 + 0.8) * 8600 + Math.cos(phase * 0.4) * 2100);
  const alertStatus = rso2 < 70 ? "HIPOKSIA" : rso2 < 76 ? "WASPADA" : "NORMAL";

  return normalizeTelemetry({
    timestamp: new Date().toISOString(),
    deviceId: DEFAULT_DEVICE_ID,
    rso2,
    red,
    ir,
    motion: index > 0 && index % 12 === 0 ? "TERDETEKSI" : "STABIL",
    sqi: Number((94 + Math.sin(phase * 0.7) * 4).toFixed(2)),
    battery: Math.max(60, 92 - Math.floor(index / 120)),
    alertStatus,
  });
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
