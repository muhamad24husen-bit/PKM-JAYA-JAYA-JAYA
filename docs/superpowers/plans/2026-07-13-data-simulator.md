# MQTT Data Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An opt-in `npm run simulate` script that publishes realistic NIRWANA-AI telemetry to the real MQTT broker — backfill N hours (fills the 6/24/72h chart windows + baseline) then stream live at 1 Hz — so the dashboard charts can be tested without hardware.

**Architecture:** Two small files: `scripts/simulate.gen.mjs` holds pure, unit-testable generator functions (thresholds, backfill timestamp series, one-sample generator with a scheduled hypoxia episode + random dips); `scripts/simulate.mjs` is the CLI entry (flag parsing, dotenv, MQTT connection, backfill loop then `setInterval` live loop, SIGINT summary). No application code is touched — data flows through the production path broker → bridge → rollup → SSE → chart.

**Tech Stack:** Node ESM, mqtt.js + dotenv (already dependencies), node:test.

**Spec:** `docs/superpowers/specs/2026-07-13-data-simulator-design.md`

## Global Constraints

- **No new npm dependencies.** Tests run via existing `npm test` (`node --test` — plain, no dir argument; `node --test tests/` breaks on this Windows/Node 24 setup).
- Application code (backend/frontend) untouched: only `scripts/`, `tests/`, `package.json`, `README.md`.
- Console copy in Indonesian.
- Simulator-owned thresholds (spec §3): `NORMAL ≥ 65`, `WASPADA 55–64.9`, `HIPOKSIA < 55`; scheduled backfill episode floor `52`.
- Defaults: `--backfill 26` (hours, `0` skips), `--interval 1000` (ms, min 100).
- Backfill sends **oldest → newest** with explicit `timestamp`; live samples have **no** `timestamp` field.
- Broker/topic from `MQTT_URL` / `MQTT_TOPIC` env (dotenv), defaults `DEFAULT_MQTT_URL` / `DEFAULT_TOPIC` from `lib/telemetry.shared.mjs`.

---

### Task 1: Pure generator (`scripts/simulate.gen.mjs`)

**Files:**
- Create: `scripts/simulate.gen.mjs`
- Test: `tests/simulate.test.mjs`

**Interfaces:**
- Consumes: `MINUTE_MS`, `HOUR_MS` from `../lib/trend.shared.mjs`; `DEFAULT_DEVICE_ID` from `../lib/telemetry.shared.mjs`.
- Produces (used by Task 2):
  - `AMBANG_WASPADA = 65`, `AMBANG_HIPOKSIA = 55`
  - `alertStatusFor(rso2) → "NORMAL"|"WASPADA"|"HIPOKSIA"`
  - `deretBackfill(nowMs, jam) → number[]` — minute timestamps, ascending, all `< nowMs`
  - `buatStateAwal(nowMs, jamBackfill) → { tAwalSesi, episode }`
  - `buatSampel(tMs, state, acak = Math.random) → { payload, state }` — payload has **no** `timestamp` field

- [ ] **Step 1: Write failing tests in `tests/simulate.test.mjs`**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `scripts/simulate.gen.mjs` does not exist (module load error for `tests/simulate.test.mjs`; the other 17 tests still pass).

- [ ] **Step 3: Create `scripts/simulate.gen.mjs`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 21 tests pass (17 existing + 4 new), fail 0.

- [ ] **Step 5: Commit**

```powershell
git add scripts/simulate.gen.mjs tests/simulate.test.mjs
git commit -m "feat: add pure telemetry generator for data simulator"
```

---

### Task 2: CLI entry (`scripts/simulate.mjs`) + npm script

**Files:**
- Create: `scripts/simulate.mjs`
- Modify: `package.json` (add `simulate` script)

**Interfaces:**
- Consumes: `buatSampel`, `buatStateAwal`, `deretBackfill` from `./simulate.gen.mjs`; `DEFAULT_MQTT_URL`, `DEFAULT_TOPIC` from `../lib/telemetry.shared.mjs`; `mqtt`, `dotenv` packages.
- Produces: `npm run simulate` CLI per spec §2.

- [ ] **Step 1: Create `scripts/simulate.mjs`**

```js
import dotenv from "dotenv";
import mqtt from "mqtt";
import { DEFAULT_MQTT_URL, DEFAULT_TOPIC } from "../lib/telemetry.shared.mjs";
import { buatSampel, buatStateAwal, deretBackfill } from "./simulate.gen.mjs";

dotenv.config();

const USAGE = `Simulator data NIRWANA-AI — publish payload MQTT realistis untuk uji dashboard.

Pemakaian:
  npm run simulate                     backfill 26 jam + live 1 Hz
  npm run simulate -- --backfill 2    backfill 2 jam + live
  npm run simulate -- --backfill 0    langsung live tanpa backfill
  npm run simulate -- --interval 500  periode live 500 ms

Flag:
  --backfill <jam>   jam riwayat yang diisi ke belakang (default 26, 0 = lewati)
  --interval <ms>    periode publish live dalam ms (default 1000, min 100)
  --help             tampilkan bantuan ini

Broker/topic dari env MQTT_URL & MQTT_TOPIC (lihat .env), default mqtt://localhost:1883 / nirwana/telemetry.`;

function parseArgs(argv) {
  const opsi = { backfill: 26, interval: 1000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--backfill") {
      opsi.backfill = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--interval") {
      opsi.interval = Number(argv[i + 1]);
      i += 1;
    } else {
      return { error: `Flag tidak dikenal: ${arg}` };
    }
  }
  if (!Number.isFinite(opsi.backfill) || opsi.backfill < 0) {
    return { error: "--backfill harus angka >= 0 (jam)" };
  }
  if (!Number.isFinite(opsi.interval) || opsi.interval < 100) {
    return { error: "--interval harus angka >= 100 (ms)" };
  }
  return { opsi };
}

const hasilParse = parseArgs(process.argv.slice(2));
if (hasilParse.help) {
  console.log(USAGE);
  process.exit(0);
}
if (hasilParse.error) {
  console.error(`${hasilParse.error}\n\n${USAGE}`);
  process.exit(1);
}
const { opsi } = hasilParse;

const mqttUrl = process.env.MQTT_URL || DEFAULT_MQTT_URL;
const topic = process.env.MQTT_TOPIC || DEFAULT_TOPIC;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let terkirim = 0;
let liveTimer = null;
let terhubung = false;

const client = mqtt.connect(mqttUrl, { connectTimeout: 5000, reconnectPeriod: 3000 });

client.on("error", (error) => {
  if (!terhubung) {
    console.error(`Broker MQTT tidak bisa dihubungi di ${mqttUrl} — jalankan Mosquitto dulu. (${error.message})`);
    process.exit(1);
  }
  console.warn(`Koneksi MQTT bermasalah: ${error.message} (mencoba ulang otomatis)`);
});

function kirim(payload) {
  client.publish(topic, JSON.stringify(payload));
  terkirim += 1;
}

async function mulai() {
  const now = Date.now();
  let state = buatStateAwal(now, opsi.backfill);

  if (opsi.backfill > 0) {
    const deret = deretBackfill(now, opsi.backfill);
    console.log(`Backfill ${opsi.backfill} jam (${deret.length} sampel per menit) ke topic ${topic}...`);
    for (let i = 0; i < deret.length; i += 1) {
      const hasil = buatSampel(deret[i], state);
      state = hasil.state;
      kirim({ ...hasil.payload, timestamp: new Date(deret[i]).toISOString() });
      if ((i + 1) % 240 === 0) console.log(`  ...${i + 1}/${deret.length} sampel`);
      await sleep(15);
    }
    console.log(`Backfill selesai (${deret.length} sampel).`);
  }

  console.log(`Live tiap ${opsi.interval} ms — hentikan dengan Ctrl+C.`);
  liveTimer = setInterval(() => {
    const hasil = buatSampel(Date.now(), state);
    state = hasil.state;
    kirim(hasil.payload);
    if (terkirim % 30 === 0) {
      console.log(`  live: rso2 ${hasil.payload.rso2}% [${hasil.payload.alertStatus}] — total ${terkirim} pesan`);
    }
  }, opsi.interval);
}

client.on("connect", () => {
  if (terhubung) return; // reconnect: jangan mulai ulang simulasi
  terhubung = true;
  console.log(`Terhubung ke ${mqttUrl}`);
  mulai();
});

process.on("SIGINT", () => {
  if (liveTimer) clearInterval(liveTimer);
  client.end(true, () => {
    console.log(`\nSimulasi berhenti. Total ${terkirim} pesan terkirim ke ${topic}.`);
    process.exit(0);
  });
});
```

- [ ] **Step 2: Add npm script**

In `package.json` `"scripts"`, after `"backend"`, add:

```json
"simulate": "node scripts/simulate.mjs",
```

- [ ] **Step 3: Verify CLI behaviors**

- Run: `node scripts/simulate.mjs --help`
  Expected: usage text, exit 0.
- Run: `node scripts/simulate.mjs --backfill -1`
  Expected: `--backfill harus angka >= 0 (jam)` + usage, exit 1.
- Run (broker-down path, PowerShell): `$env:MQTT_URL = "mqtt://localhost:59999"; node scripts/simulate.mjs --backfill 0; $env:MQTT_URL = $null`
  Expected: `Broker MQTT tidak bisa dihubungi di mqtt://localhost:59999 — jalankan Mosquitto dulu. (...)`, exit 1.
- Run: `npm test` → still all pass.

- [ ] **Step 4: Commit**

```powershell
git add scripts/simulate.mjs package.json
git commit -m "feat: add npm run simulate CLI (backfill + live MQTT publisher)"
```

---

### Task 3: README + end-to-end verification

**Files:**
- Modify: `README.md` (section "Menguji Tanpa Alat Fisik")

**Interfaces:**
- Consumes: working `npm run simulate` from Task 2; running backend + broker.
- Produces: documented feature, verified live against the dashboard.

- [ ] **Step 1: Rewrite the "Menguji Tanpa Alat Fisik" section**

Replace the section body (keep the heading) with:

```markdown
Gunakan **simulator bawaan** — script opt-in yang mem-publish payload MQTT **asli** ke broker (aplikasi tetap berjalan murni dari data MQTT, bukan mode simulasi internal):

​```bash
npm run simulate                     # backfill 26 jam + live 1 Hz
npm run simulate -- --backfill 2    # backfill 2 jam saja + live
npm run simulate -- --backfill 0    # langsung live tanpa backfill
npm run simulate -- --interval 500  # live 2 Hz
​```

| Flag | Default | Keterangan |
| ---- | ------- | ---------- |
| `--backfill <jam>` | `26` | Isi riwayat N jam ke belakang (timestamp eksplisit) — mengisi jendela grafik 6/24/72 jam + baseline. `0` = lewati. |
| `--interval <ms>` | `1000` | Periode publish live (minimum 100 ms). |

Pola datanya realistis: gelombang halus di kisaran 62–74%, satu episode hipoksia terjadwal di tengah backfill, dan dip acak sesekali ke rentang Waspada/Hipoksia saat live. Broker/topic mengikuti `MQTT_URL` / `MQTT_TOPIC` di `.env`. Hentikan dengan `Ctrl+C`. Untuk mengosongkan kembali dashboard, pakai tombol **Clear History** di halaman Riwayat Data.

Alternatif manual — publish payload sendiri dengan `mosquitto_pub`:

​```bash
mosquitto_pub -h localhost -t nirwana/telemetry -m '{"deviceId":"nirwana_001","rso2":68.4,"red":52420,"ir":68360,"motion":"STABIL","sqi":96.2,"battery":91,"alertStatus":"NORMAL"}'
​```

Atau pakai aplikasi GUI seperti **MQTT Explorer** untuk publish berkala sambil menyesuaikan nilainya secara manual.
```

(The ​``` fences above are literal triple-backtick fences in the README.)

- [ ] **Step 2: End-to-end verification (backend + broker running)**

1. `npm test` → all pass; `npm run lint` → exit 0 (scripts/ is outside lint scope; lint guards the untouched app code).
2. Start `npm run simulate -- --backfill 2` in the background; wait ~30 s.
3. `curl http://localhost:4000/api/telemetry/rollup` → ±120 buckets, `sessionStartedAt` ≈ 2 jam lalu, `baseline` non-null.
4. Browser Dashboard: kelima jendela dropdown terisi (6/24/72 jam parsial + keterangan cakupan), garis baseline muncul, episode hipoksia terlihat (jendela 1–6 jam), panel Status Peringatan berubah saat dip live.
5. Stop the simulator; process exits, backend stays healthy. (SIGINT summary is verified by running the script interactively — best-effort when driven from automation.)

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: document npm run simulate in testing-without-hardware section"
```
