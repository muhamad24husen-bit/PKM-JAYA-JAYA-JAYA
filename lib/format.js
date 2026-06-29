export const statusMeta = {
  NORMAL: {
    label: "Normal",
    header: "NORMAL",
    tone: "text-slate-300",
    border: "border-slate-500/25",
    bg: "bg-slate-400/5",
    nav: "Status stabil",
    top: "NORMAL",
  },
  WASPADA: {
    label: "Waspada",
    header: "WASPADA",
    tone: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/8",
    nav: "Perlu pemantauan",
    top: "ALERT",
  },
  HIPOKSIA: {
    label: "Hipoksia",
    header: "HIPOKSIA",
    tone: "text-[#ffb4ab]",
    border: "border-[#ffb4ab]",
    bg: "bg-[#ffb4ab]/8",
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
