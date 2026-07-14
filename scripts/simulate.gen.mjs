import { MINUTE_MS, HOUR_MS } from "../lib/trend.shared.mjs";
import { DEFAULT_DEVICE_ID } from "../lib/telemetry.shared.mjs";

// Ambang milik simulator (frontend hanya menampilkan status dari payload) — spec §3.
export const AMBANG_WASPADA = 65; // rso2 < 65 → WASPADA
export const AMBANG_HIPOKSIA = 55; // rso2 < 55 → HIPOKSIA
export const DASAR_EPISODE = 52;

export function alertStatusFor(rso2) {
  if (rso2 < AMBANG_HIPOKSIA) return "HIPOKSIA";
  if (rso2 < AMBANG_WASPADA) return "WASPADA";
  return "NORMAL";
}

// Timestamp per menit, urut tertua → terbaru (pesan pertama menentukan sessionStartedAt di rollup).
export function deretBackfill(nowMs, jam) {
  const total = Math.round(jam * 60);
  const daftar = [];
  for (let i = total; i >= 1; i -= 1) {
    daftar.push(nowMs - i * MINUTE_MS);
  }
  return daftar;
}

export function buatStateAwal(nowMs, jamBackfill) {
  const backfillMs = Math.round(jamBackfill * 60) * MINUTE_MS;
  const tAwalSesi = nowMs - backfillMs;
  // Episode hipoksia terjadwal 20 menit di tengah rentang backfill (spec §3).
  const tengah = tAwalSesi + backfillMs / 2;
  const episode =
    backfillMs > 0
      ? { mulai: tengah - 10 * MINUTE_MS, selesai: tengah + 10 * MINUTE_MS, dasar: DASAR_EPISODE }
      : null;
  return { tAwalSesi, episode };
}

function jadwalkanEpisodeAcak(tMs, acak) {
  const mulai = tMs + (2 + acak() * 3) * MINUTE_MS; // 2-5 menit lagi
  const durasi = (30 + acak() * 30) * 1000; // 30-60 detik
  return { mulai, selesai: mulai + durasi, dasar: 52 + acak() * 8 }; // dasar 52-60%
}

export function buatSampel(tMs, state, acak = Math.random) {
  const elapsed = tMs - state.tAwalSesi;

  // 10 menit pertama sesi stabil (baseline masuk akal), lalu gelombang lambat 6 jam + halus 90 detik + noise.
  let dasar;
  if (elapsed < 10 * MINUTE_MS) {
    dasar = 67 + (acak() * 2 - 1) * 0.5;
  } else {
    dasar =
      68 +
      6 * Math.sin((2 * Math.PI * elapsed) / (6 * HOUR_MS)) +
      1.2 * Math.sin((2 * Math.PI * elapsed) / (90 * 1000)) +
      (acak() * 2 - 1) * 0.7;
  }

  // Episode dip: turun mengikuti kurva sin (0→1→0) menuju nilai dasar episode, lalu jadwalkan episode acak berikutnya.
  let episode = state.episode;
  let nilai = dasar;
  if (episode && tMs >= episode.mulai && tMs <= episode.selesai) {
    const f = (tMs - episode.mulai) / (episode.selesai - episode.mulai);
    nilai = dasar - Math.sin(Math.PI * f) * (dasar - episode.dasar);
  } else if (!episode || tMs > episode.selesai) {
    episode = jadwalkanEpisodeAcak(tMs, acak);
  }

  nilai = Math.min(95, Math.max(40, nilai));
  const rso2 = Number(nilai.toFixed(1));

  const motionTerdeteksi = acak() < 0.03;
  const sqi = Number((motionTerdeteksi ? 80 + acak() * 10 : 92 + acak() * 7).toFixed(1));
  // Battery deterministik: turun ~1% per 30 menit sejak awal sesi (spec §3).
  const battery = Math.round(Math.min(95, Math.max(20, 95 - elapsed / (30 * MINUTE_MS))));
  const geser = rso2 - 68;

  const payload = {
    deviceId: DEFAULT_DEVICE_ID,
    rso2,
    red: Math.round(52000 + geser * 300 + (acak() * 2 - 1) * 400),
    ir: Math.round(68000 + geser * 200 + (acak() * 2 - 1) * 400),
    motion: motionTerdeteksi ? "TERDETEKSI" : "STABIL",
    sqi,
    battery,
    alertStatus: alertStatusFor(rso2),
  };

  return { payload, state: { ...state, episode } };
}
