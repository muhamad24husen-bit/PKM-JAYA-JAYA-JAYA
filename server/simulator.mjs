import { buatSampel, buatStateAwal, deretBackfill } from "../scripts/simulate.gen.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LIVE_UPDATE_EVERY = 60;

// Runner simulasi in-process: publish lewat client MQTT bridge sehingga
// jalur produksi (broker → bridge → rollup → SSE) tetap teruji (spec §2).
export function createSimulatorRunner({
  publish,
  onUpdate = () => {},
  backfillDelayMs = 15,
  intervalMs = 1000,
} = {}) {
  let running = false;
  let phase = "idle";
  let startedAt = null;
  let backfillHours = null;
  let sent = 0;
  let cancelled = false;
  let liveTimer = null;

  function status() {
    return { running, phase, startedAt, sent, backfillHours };
  }

  function mulaiLive(state) {
    phase = "live";
    onUpdate(status());
    let stateLive = state;
    liveTimer = setInterval(() => {
      const hasil = buatSampel(Date.now(), stateLive);
      stateLive = hasil.state;
      publish(hasil.payload); // live: tanpa field timestamp (jam server)
      sent += 1;
      if (sent % LIVE_UPDATE_EVERY === 0) onUpdate(status());
    }, intervalMs);
    liveTimer.unref?.();
  }

  async function jalankanBackfill(jam, state) {
    const deret = deretBackfill(Date.now(), jam);
    let stateJalan = state;
    for (const ts of deret) {
      if (cancelled) return;
      const hasil = buatSampel(ts, stateJalan);
      stateJalan = hasil.state;
      publish({ ...hasil.payload, timestamp: new Date(ts).toISOString() });
      sent += 1;
      if (backfillDelayMs > 0) await sleep(backfillDelayMs);
    }
    if (!cancelled) mulaiLive(stateJalan);
  }

  function start({ backfillHours: jam } = {}) {
    if (running) {
      return { error: "Simulasi sudah berjalan." };
    }
    running = true;
    cancelled = false;
    sent = 0;
    startedAt = new Date().toISOString();
    backfillHours = jam;
    const state = buatStateAwal(Date.now(), jam);
    if (jam > 0) {
      phase = "backfill";
      onUpdate(status());
      jalankanBackfill(jam, state);
    } else {
      mulaiLive(state);
    }
    return status();
  }

  function stop() {
    const sebelumnya = running;
    cancelled = true;
    if (liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
    running = false;
    phase = "idle";
    startedAt = null;
    backfillHours = null;
    if (sebelumnya) onUpdate(status()); // transisi → idle; stop saat sudah idle tidak memicu update
    return status();
  }

  return { start, stop, status };
}
