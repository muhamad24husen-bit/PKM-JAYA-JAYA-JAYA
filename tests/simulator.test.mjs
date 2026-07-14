import test from "node:test";
import assert from "node:assert/strict";
import { createSimulatorRunner } from "../server/simulator.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("status awal idle", () => {
  const runner = createSimulatorRunner({ publish: () => {} });
  assert.deepEqual(runner.status(), {
    running: false,
    phase: "idle",
    startedAt: null,
    sent: 0,
    backfillHours: null,
  });
});

test("backfill selesai lalu masuk fase live; timestamp urut naik, live tanpa timestamp", async () => {
  const terkirim = [];
  const fase = [];
  const runner = createSimulatorRunner({
    publish: (p) => terkirim.push(p),
    onUpdate: (s) => fase.push(s.phase),
    backfillDelayMs: 0,
    intervalMs: 10,
  });
  const hasil = runner.start({ backfillHours: 0.05 }); // 3 sampel backfill
  assert.equal(hasil.running, true);
  assert.equal(runner.status().phase, "live"); // delay 0 → backfill sinkron
  assert.equal(terkirim.length, 3);
  assert.ok(terkirim.every((p) => typeof p.timestamp === "string"));
  assert.ok(Date.parse(terkirim[0].timestamp) < Date.parse(terkirim[2].timestamp));
  assert.ok(fase.includes("live"));

  await sleep(45);
  runner.stop();
  assert.ok(terkirim.length > 3, "sampel live harus bertambah");
  assert.equal("timestamp" in terkirim.at(-1), false);
});

test("stop membatalkan backfill sebelum selesai", async () => {
  const terkirim = [];
  const runner = createSimulatorRunner({
    publish: (p) => terkirim.push(p),
    backfillDelayMs: 5,
    intervalMs: 20,
  });
  runner.start({ backfillHours: 2 }); // 120 sampel × 5 ms
  await sleep(25);
  const status = runner.stop();
  const saatStop = terkirim.length;
  assert.ok(saatStop < 120, `berhenti dini (baru ${saatStop})`);
  assert.equal(status.running, false);
  assert.equal(status.phase, "idle");
  await sleep(50);
  assert.ok(terkirim.length <= saatStop + 1, "publish berhenti setelah stop");
});

test("double start ditolak; stop idempoten", async () => {
  const runner = createSimulatorRunner({ publish: () => {}, backfillDelayMs: 0, intervalMs: 10 });
  runner.start({ backfillHours: 0 });
  const kedua = runner.start({ backfillHours: 0 });
  assert.equal(kedua.error, "Simulasi sudah berjalan.");
  runner.stop();
  const lagi = runner.stop();
  assert.equal(lagi.running, false);
  assert.equal(lagi.phase, "idle");
});

test("backfillHours 0 langsung live dan onUpdate terpanggil", async () => {
  const fase = [];
  const runner = createSimulatorRunner({
    publish: () => {},
    onUpdate: (s) => fase.push(s.phase),
    intervalMs: 10,
  });
  runner.start({ backfillHours: 0 });
  assert.equal(runner.status().phase, "live");
  assert.deepEqual(fase, ["live"]);
  runner.stop();
});
