import test from "node:test";
import assert from "node:assert/strict";
import {
  AMBANG_HIPOKSIA,
  AMBANG_WASPADA,
  alertStatusFor,
  buatSampel,
  buatStateAwal,
  deretBackfill,
} from "../scripts/simulate.gen.mjs";
import { normalizeTelemetry } from "../lib/telemetry.shared.mjs";
import { MINUTE_MS } from "../lib/trend.shared.mjs";

test("alertStatusFor mengikuti ambang 65/55", () => {
  assert.equal(alertStatusFor(70), "NORMAL");
  assert.equal(alertStatusFor(AMBANG_WASPADA), "NORMAL"); // 65 tepat → NORMAL
  assert.equal(alertStatusFor(64.9), "WASPADA");
  assert.equal(alertStatusFor(AMBANG_HIPOKSIA), "WASPADA"); // 55 tepat → WASPADA
  assert.equal(alertStatusFor(54.9), "HIPOKSIA");
});

test("deretBackfill: jumlah, urutan naik, semua di masa lalu", () => {
  const now = Date.now();
  const deret = deretBackfill(now, 2);
  assert.equal(deret.length, 120);
  assert.equal(deret[0], now - 120 * MINUTE_MS);
  assert.equal(deret.at(-1), now - MINUTE_MS);
  for (let i = 1; i < deret.length; i += 1) assert.ok(deret[i] > deret[i - 1]);
  assert.deepEqual(deretBackfill(now, 0), []);
});

test("buatSampel: payload valid tanpa timestamp, status konsisten ambang", () => {
  const now = Date.now();
  let state = buatStateAwal(now, 0);
  for (let i = 0; i < 50; i += 1) {
    const hasil = buatSampel(now + i * 1000, state);
    state = hasil.state;
    const p = hasil.payload;
    assert.equal("timestamp" in p, false);
    assert.ok(p.rso2 >= 40 && p.rso2 <= 95);
    assert.equal(p.alertStatus, alertStatusFor(p.rso2));
    assert.ok(["STABIL", "TERDETEKSI"].includes(p.motion));
    assert.ok(p.battery >= 20 && p.battery <= 95);
    const normal = normalizeTelemetry(p);
    assert.ok(Number.isFinite(normal.rso2));
    assert.ok(Number.isFinite(normal.sqi));
  }
});

test("episode hipoksia terjadwal di tengah backfill mencapai < 55", () => {
  const now = Date.now();
  const state = buatStateAwal(now, 26);
  const tengah = state.episode.mulai + (state.episode.selesai - state.episode.mulai) / 2;
  const { payload } = buatSampel(tengah, state);
  assert.ok(payload.rso2 < AMBANG_HIPOKSIA, `rso2 ${payload.rso2} seharusnya < 55`);
  assert.equal(payload.alertStatus, "HIPOKSIA");
});
