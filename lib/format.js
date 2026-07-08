export const statusMeta = {
  NORMAL: {
    label: "Normal",
    header: "NORMAL",
    tone: "text-nirwana-normal",
    dot: "bg-nirwana-normal",
    border: "border-nirwana-normal/25",
    bg: "bg-nirwana-normalSoft",
    nav: "Status stabil",
    top: "NORMAL",
  },
  WASPADA: {
    label: "Waspada",
    header: "WASPADA",
    tone: "text-nirwana-waspada",
    dot: "bg-nirwana-waspada",
    border: "border-nirwana-waspada/25",
    bg: "bg-nirwana-waspadaSoft",
    nav: "Perlu pemantauan",
    top: "ALERT",
  },
  HIPOKSIA: {
    label: "Hipoksia",
    header: "HIPOKSIA",
    tone: "text-nirwana-hipoksia",
    dot: "bg-nirwana-hipoksia",
    border: "border-nirwana-hipoksia/25",
    bg: "bg-nirwana-hipoksiaSoft",
    nav: "Kondisi kritis",
    top: "ALERT",
  },
};

export function statusOf(status) {
  return statusMeta[status] || statusMeta.NORMAL;
}

export function shortDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(".", ":");
}

export function signalLabel(value) {
  if (value === null || value === undefined) return "-";
  if (value >= 80) return "BAIK";
  if (value >= 60) return "CUKUP";
  return "BURUK";
}

export function formatRso2(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "-";
}

export function formatMotion(value) {
  const motion = String(value || "-").trim();
  if (motion === "-") return motion;
  if (motion.toUpperCase() === "TERDETEKSI") return "Terdeteksi";
  if (motion.toUpperCase() === "STABIL") return "Stabil";
  return motion;
}
