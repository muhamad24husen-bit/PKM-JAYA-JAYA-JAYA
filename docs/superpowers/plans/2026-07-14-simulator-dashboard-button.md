# Dashboard-Triggered Simulator Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start/stop the data simulator from the dashboard UI (Pengaturan → "Simulasi Data" card with a backfill choice) with a global "SIMULASI" badge while synthetic data flows.

**Architecture:** A new in-process runner `server/simulator.mjs` wraps the existing pure generator (`scripts/simulate.gen.mjs`) and publishes through the bridge's own MQTT client to the real broker — the production path (broker → bridge → rollup → SSE → charts) stays exercised. The bridge exposes `POST /api/simulate/start|stop` and adds `simulation` to the existing `status` SSE payload (no new SSE events). The frontend threads a `simulation` state from the status event into a Settings card, TopAppBar badge, and Realtime header badge.

**Tech Stack:** Node ESM, Express (existing), mqtt.js (existing), React/Next + Tailwind tokens, node:test. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-14-simulator-dashboard-button-design.md`

## Global Constraints

- **No new npm dependencies**; tests via existing `npm test` (`node --test`, plain — no dir argument).
- UI copy Indonesian; theme = light clinical tokens (`nirwana-*`); no dark/glow styling.
- **No new SSE events** — simulation status rides the existing `status` event via `statusPayload()`.
- Endpoint contract (spec §3): `POST /api/simulate/start` body `{ backfillHours }` number 0–72 → 400 invalid, 409 running, 409 broker disconnected, 202 `{ simulation }`; `POST /api/simulate/stop` → always 200 `{ simulation }`, idempotent.
- `status()` shape (spec §2): `{ running, phase: "idle"|"backfill"|"live", startedAt, sent, backfillHours }`.
- Backfill publishes carry explicit `timestamp` (oldest→newest); live publishes have **no** timestamp field.
- `onUpdate(status())` fires on every phase transition and every 60 live messages.
- Settings card default backfill choice = "2 jam"; options Tanpa (0) / 2 jam / 26 jam; interval fixed 1000 ms.
- CLI `npm run simulate` stays untouched.

---

### Task 1: In-process runner (`server/simulator.mjs`)

**Files:**
- Create: `server/simulator.mjs`
- Test: `tests/simulator.test.mjs`

**Interfaces:**
- Consumes: `buatSampel(tMs, state)`, `buatStateAwal(nowMs, jamBackfill)`, `deretBackfill(nowMs, jam)` from `../scripts/simulate.gen.mjs`.
- Produces (used by Task 2): `createSimulatorRunner({ publish, onUpdate = () => {}, backfillDelayMs = 15, intervalMs = 1000 }) → { start({ backfillHours }) → status|{error}, stop() → status, status() }`.

- [ ] **Step 1: Write failing tests in `tests/simulator.test.mjs`**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `server/simulator.mjs` does not exist (module load error; the existing 21 tests still pass).

- [ ] **Step 3: Create `server/simulator.mjs`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: 26 tests pass (21 existing + 5 new), fail 0.

- [ ] **Step 5: Commit**

```powershell
git add server/simulator.mjs tests/simulator.test.mjs
git commit -m "feat: add in-process simulator runner for backend"
```

---

### Task 2: Bridge wiring + endpoints (`server/mqtt-bridge.mjs`)

**Files:**
- Modify: `server/mqtt-bridge.mjs`

**Interfaces:**
- Consumes: `createSimulatorRunner` from Task 1; existing `mqttClient`, `topic`, `brokerStatus`, `broadcastStatus()`, `statusPayload()`.
- Produces (used by Task 3): `POST /api/simulate/start` / `POST /api/simulate/stop` per Global Constraints; `statusPayload()` gains `simulation` field (rides SSE `status`).

- [ ] **Step 1: Import and create the runner**

After `import { createRollupStore } from "./rollup.mjs";` add:

```js
import { createSimulatorRunner } from "./simulator.mjs";
```

After the `const rollup = createRollupStore({ filePath: rollupFile });` line add:

```js
// Publish lewat client MQTT bridge → broker mengirim balik ke subscription,
// sehingga simulasi menempuh jalur data produksi yang sama dengan perangkat asli.
const simulator = createSimulatorRunner({
  publish: (payload) => {
    mqttClient.publish(topic, JSON.stringify(payload));
  },
  onUpdate: () => broadcastStatus(),
});
```

(`mqttClient` is declared further down the file; the arrow function only dereferences it at publish time, after connect — safe.)

- [ ] **Step 2: Add `simulation` to `statusPayload()`**

In `statusPayload()`, after `historyCount: history.length,` add:

```js
    simulation: simulator.status(),
```

- [ ] **Step 3: Add endpoints**

After the `app.get("/api/telemetry/rollup", ...)` route add:

```js
app.post("/api/simulate/start", (req, res) => {
  const backfillHours = Number(req.body?.backfillHours);
  if (!Number.isFinite(backfillHours) || backfillHours < 0 || backfillHours > 72) {
    res.status(400).json({ error: "backfillHours harus angka 0-72." });
    return;
  }
  if (simulator.status().running) {
    res.status(409).json({ error: "Simulasi sudah berjalan." });
    return;
  }
  if (brokerStatus !== "connected") {
    res.status(409).json({ error: "Broker MQTT tidak terhubung." });
    return;
  }
  // Broadcast SSE status terjadi lewat onUpdate runner pada tiap transisi fase.
  const simulation = simulator.start({ backfillHours });
  res.status(202).json({ simulation });
});

app.post("/api/simulate/stop", (_req, res) => {
  const simulation = simulator.stop();
  res.json({ simulation });
});
```

- [ ] **Step 4: Stop on shutdown**

In `shutdown()`, after `rollup.flush();` add:

```js
  simulator.stop();
```

- [ ] **Step 5: Verify endpoints with a running server**

Restart the backend, then:

- `curl.exe -s -X POST http://localhost:4000/api/simulate/start -H "Content-Type: application/json" -d "{\"backfillHours\":0}"` → `202` with `{"simulation":{"running":true,"phase":"live",...}}`
- Repeat the same start → `409 {"error":"Simulasi sudah berjalan."}`
- `curl.exe -s -X POST http://localhost:4000/api/simulate/start -H "Content-Type: application/json" -d "{\"backfillHours\":\"x\"}"` → `400`
- `curl.exe -s http://localhost:4000/api/health` → payload includes `"simulation":{"running":true,...}`
- `curl.exe -s -X POST http://localhost:4000/api/simulate/stop` → `200`, repeat → still `200` idempotent
- `npm test` still green.

- [ ] **Step 6: Commit**

```powershell
git add server/mqtt-bridge.mjs
git commit -m "feat: expose simulator start/stop endpoints and status over SSE"
```

---

### Task 3: Frontend — state, handlers, badge, Settings card

**Files:**
- Create: `components/ui/SimulationBadge.jsx`
- Modify: `app/page.js`
- Modify: `components/TopAppBar.jsx`
- Modify: `components/views/RealtimeView.jsx:17-49,153-156`
- Modify: `components/views/SettingsView.jsx`

**Interfaces:**
- Consumes: endpoints from Task 2; SSE `status` payload field `simulation`.
- Produces: props `simulation` (object|null), `onSimulateStart(backfillHours) → Promise<string>` (error message or ""), `onSimulateStop() → Promise<string>`.

- [ ] **Step 1: Create `components/ui/SimulationBadge.jsx`**

```jsx
import { FlaskConical } from "lucide-react";

export function SimulationBadge({ simulation }) {
  if (!simulation?.running) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-nirwana-waspada/40 bg-nirwana-waspadaSoft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-nirwana-waspada">
      <FlaskConical size={12} strokeWidth={2.2} />
      Simulasi
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nirwana-waspada" />
    </span>
  );
}
```

- [ ] **Step 2: `app/page.js` — state + handlers + props**

Add state next to `const [rollup, setRollup] = useState(null);`:

```js
const [simulation, setSimulation] = useState(null);
```

In the SSE `status` listener, after `setLastError(payload.lastError || "");` add:

```js
        setSimulation(payload.simulation ?? null);
```

Add the two handlers next to `clearHistory()`:

```js
  async function simulateStart(backfillHours) {
    try {
      const response = await fetch(buildApiUrl(telemetryApiUrl, "/api/simulate/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backfillHours }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        return payload?.error || "Backend menolak permintaan simulasi.";
      }
      return "";
    } catch {
      return "Backend tidak dapat dihubungi.";
    }
  }

  async function simulateStop() {
    try {
      const response = await fetch(buildApiUrl(telemetryApiUrl, "/api/simulate/stop"), {
        method: "POST",
      });
      if (!response.ok) {
        return "Backend menolak permintaan berhenti.";
      }
      return "";
    } catch {
      return "Backend tidak dapat dihubungi.";
    }
  }
```

Update the JSX call sites:
- `<RealtimeView ... telemetryApiUrl={telemetryApiUrl} />` → add `simulation={simulation}`
- `<TopAppBar current={displayCurrent} />` → `<TopAppBar current={displayCurrent} simulation={simulation} />`
- `<SettingsView topic={topic} telemetryApiUrl={telemetryApiUrl} />` → add `simulation={simulation} onSimulateStart={simulateStart} onSimulateStop={simulateStop}`

- [ ] **Step 3: Badge in `components/TopAppBar.jsx`**

Add import: `import { SimulationBadge } from "@/components/ui/SimulationBadge";`
Signature: `export function TopAppBar({ current, simulation = null }) {`
In the right cluster, immediately after `<div className="flex items-center justify-between gap-5 lg:justify-end">` insert:

```jsx
          <SimulationBadge simulation={simulation} />
```

- [ ] **Step 4: Badge in `components/views/RealtimeView.jsx`**

Add import: `import { SimulationBadge } from "@/components/ui/SimulationBadge";`
`function RealtimeHeader({ current, connectionStatus })` → `function RealtimeHeader({ current, connectionStatus, simulation })`
In its right group, immediately after `<div className="flex flex-wrap items-center gap-4 sm:justify-end">` insert:

```jsx
          <SimulationBadge simulation={simulation} />
```

Line 153: `export function RealtimeView({ current, connectionStatus, chartData, lastError, topic, telemetryApiUrl })` → add `simulation = null` to the destructured props.
Line 156: `<RealtimeHeader current={current} connectionStatus={connectionStatus} />` → add `simulation={simulation}`.

- [ ] **Step 5: "Simulasi Data" card in `components/views/SettingsView.jsx`**

Replace the entire file with:

```jsx
import { useState } from "react";
import { DEFAULT_DEVICE_ID, HISTORY_LIMIT } from "@/lib/telemetry";
import { shortDateTime } from "@/lib/format";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";

function SimulationCard({ simulation, onSimulateStart, onSimulateStop }) {
  const [backfillPilihan, setBackfillPilihan] = useState("2");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const berjalan = Boolean(simulation?.running);

  async function mulai() {
    setSibuk(true);
    setPesan(await onSimulateStart(Number(backfillPilihan)));
    setSibuk(false);
  }

  async function henti() {
    setSibuk(true);
    setPesan(await onSimulateStop());
    setSibuk(false);
  }

  return (
    <Card title="Simulasi Data">
      <p className="text-sm">
        <span className="text-nirwana-muted">Status: </span>
        {berjalan ? (
          <span className="font-semibold text-nirwana-waspada">
            Aktif — fase {simulation.phase === "backfill" ? "backfill" : "live"} · {simulation.sent} pesan · sejak {shortDateTime(simulation.startedAt)}
          </span>
        ) : (
          <span className="font-semibold text-nirwana-text">Nonaktif</span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-nirwana-muted">
          Isi riwayat dulu:
          <select
            value={backfillPilihan}
            onChange={(event) => setBackfillPilihan(event.target.value)}
            disabled={berjalan || sibuk}
            className="rounded-lg border border-nirwana-border bg-white px-2.5 py-1.5 text-xs font-semibold text-nirwana-text focus:outline-none focus:ring-2 focus:ring-nirwana-accent/40 disabled:opacity-50"
          >
            <option value="0">Tanpa</option>
            <option value="2">2 jam</option>
            <option value="26">26 jam</option>
          </select>
        </label>

        {berjalan ? (
          <button
            type="button"
            onClick={henti}
            disabled={sibuk}
            className="rounded-lg border border-nirwana-hipoksia/40 px-4 py-2 text-sm font-semibold text-nirwana-hipoksia transition hover:bg-nirwana-hipoksiaSoft disabled:opacity-50"
          >
            Hentikan Simulasi
          </button>
        ) : (
          <button
            type="button"
            onClick={mulai}
            disabled={sibuk}
            className="rounded-lg bg-nirwana-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Mulai Simulasi
          </button>
        )}
      </div>

      {pesan ? <p className="mt-3 text-xs font-semibold text-nirwana-hipoksia">{pesan}</p> : null}

      <p className="mt-4 text-xs text-nirwana-muted">
        Data simulasi bersifat sintetis untuk pengujian — bukan pembacaan sensor. Kosongkan lewat Riwayat Data &rarr; Clear History.
      </p>
    </Card>
  );
}

export function SettingsView({ topic, telemetryApiUrl, simulation = null, onSimulateStart, onSimulateStop }) {
  const configRows = [
    ["Topic MQTT", topic],
    ["Backend Telemetry", telemetryApiUrl],
    ["Batas Riwayat", `${HISTORY_LIMIT} data`],
    ["Device ID Default", DEFAULT_DEVICE_ID],
  ];
  const profileRows = [
    ["Pasien", `${profile.patientName} (${profile.patientCode})`],
    ["Subjek", profile.patientSubject],
    ["ID Monitor", profile.monitorId],
    ["Klinisi", `${profile.clinicianName} ${profile.clinicianTitle}`],
  ];

  return (
    <section className="space-y-6">
      <Card title="Konfigurasi Sistem">
        <dl className="space-y-3">
          {configRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-nirwana-surfaceMuted px-4 py-3">
              <dt className="text-sm text-nirwana-muted">{label}</dt>
              <dd className="break-all font-mono text-sm text-nirwana-text">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-nirwana-muted">
          Konfigurasi diambil dari environment variable. Ubah melalui file .env lalu mulai ulang aplikasi.
        </p>
      </Card>

      <Card title="Profil Pasien & Klinisi">
        <dl className="space-y-3">
          {profileRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-nirwana-surfaceMuted px-4 py-3">
              <dt className="text-sm text-nirwana-muted">{label}</dt>
              <dd className="break-all font-mono text-sm text-nirwana-text">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-nirwana-muted">
          Atur melalui variabel NEXT_PUBLIC_PATIENT_NAME, NEXT_PUBLIC_CLINICIAN_NAME, dll di file .env.
        </p>
      </Card>

      <SimulationCard simulation={simulation} onSimulateStart={onSimulateStart} onSimulateStop={onSimulateStop} />
    </section>
  );
}
```

- [ ] **Step 6: Verify lint + tests, then commit**

Run: `npm run lint` → exit 0; `npm test` → all pass.

```powershell
git add components/ui/SimulationBadge.jsx app/page.js components/TopAppBar.jsx components/views/RealtimeView.jsx components/views/SettingsView.jsx
git commit -m "feat: dashboard simulator control card and global SIMULASI badge"
```

---

### Task 4: README + end-to-end verification

**Files:**
- Modify: `README.md` (section "Menguji Tanpa Alat Fisik")

**Interfaces:**
- Consumes: everything above; running backend + frontend + broker.
- Produces: documented feature; verified live.

- [ ] **Step 1: Document the UI control**

In README section "Menguji Tanpa Alat Fisik", after the paragraph that ends with "...pakai tombol **Clear History** di halaman Riwayat Data." add:

```markdown
Simulator juga bisa dijalankan **dari UI**: buka **Pengaturan → Simulasi Data**, pilih isi riwayat (Tanpa / 2 jam / 26 jam), lalu klik **Mulai Simulasi**. Selama simulasi aktif, badge **SIMULASI** tampil di header semua halaman sebagai penanda bahwa data yang mengalir bersifat sintetis. Bila perangkat asli ikut publish pada saat yang sama, datanya akan berbaur.
```

- [ ] **Step 2: End-to-end verification**

1. `npm test` → all pass; `npm run lint` → exit 0.
2. Restart backend (new code), frontend running.
3. Browser → Pengaturan: card shows "Nonaktif"; pick "2 jam", click **Mulai Simulasi** → status becomes "Aktif — fase backfill/live · N pesan"; badge SIMULASI appears in TopAppBar; Monitoring Realtime header shows the badge too; Dashboard chart fills (24 jam window + baseline).
4. Click **Hentikan Simulasi** → status "Nonaktif", badge disappears, telemetry stops.
5. Start via curl while UI open → card/badge react via SSE without reload.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: document UI-triggered simulation control"
```
