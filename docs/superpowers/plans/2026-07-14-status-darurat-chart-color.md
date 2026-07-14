# DARURAT Label + Status-Colored Chart + Y-Axis Tens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display "Darurat/DARURAT" instead of "Hipoksia/HIPOKSIA" everywhere in the UI (internal key unchanged), color the Dashboard rSO₂ trend chart by current alert status (green/yellow/red), and fix the chart Y-axis to tens 10–100%.

**Architecture:** Pure presentation change. Single color/label source stays `statusMeta` in `lib/format.js` (gains a `chart` hex per status). `Rso2TrendChart` swaps its `critical` prop for `alertStatus`. One input alias added in `normalizeAlertStatus`.

**Tech Stack:** existing React/Tailwind/Recharts; no new deps; `npm test` (`node --test`).

**Spec:** `docs/superpowers/specs/2026-07-14-status-darurat-chart-color-design.md`

## Global Constraints

- Internal status key stays `HIPOKSIA` end-to-end (payload/backend/simulator/tests untouched except one input alias).
- Chart hex per status: NORMAL `#16a34a`, WASPADA `#d97706`, HIPOKSIA `#dc2626`.
- Y-axis: `domain={[10, 100]}`, `ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}`.
- Do NOT change: medical subtitle "Monitoring Hipoksia Ginjal Neonatus", Tailwind token names `nirwana-hipoksia*`, RealtimeView charts.

---

### Task 1: Rename display labels + input alias

**Files:**
- Modify: `lib/format.js:22-31` (statusMeta.HIPOKSIA + add `chart` to all three)
- Modify: `lib/telemetry.shared.mjs:12` (alias)
- Modify: `components/views/DashboardView.jsx:216` (panel item label)
- Modify: `components/views/AlertView.jsx:26` (SummaryCard title)
- Modify: `README.md` (status mentions)

**Interfaces:**
- Produces (used by Task 2): `statusOf(status).chart → string` hex, defined for all three statuses.

- [ ] **Step 1: `lib/format.js` — add `chart` to each status and rename HIPOKSIA labels**

In `statusMeta.NORMAL` after `top: "NORMAL",` add: `chart: "#16a34a",`
In `statusMeta.WASPADA` after `top: "ALERT",` add: `chart: "#d97706",`
Replace the HIPOKSIA block's `label`/`header` and add `chart`:

```js
  HIPOKSIA: {
    label: "Darurat",
    header: "DARURAT",
    tone: "text-nirwana-hipoksia",
    dot: "bg-nirwana-hipoksia",
    border: "border-nirwana-hipoksia/25",
    bg: "bg-nirwana-hipoksiaSoft",
    nav: "Kondisi kritis",
    top: "ALERT",
    chart: "#dc2626",
  },
```

- [ ] **Step 2: `lib/telemetry.shared.mjs` — input alias**

```js
  if (["HIPOKSIA", "HYPOXIA", "CRITICAL", "DANGER", "GAWAT", "DARURAT"].includes(status)) {
```

- [ ] **Step 3: Literal labels**

`components/views/DashboardView.jsx` in `AlertStatusPanel`: `["HIPOKSIA", "Hipoksia", ShieldAlert],` → `["HIPOKSIA", "Darurat", ShieldAlert],`
`components/views/AlertView.jsx`: `title="Total Hipoksia"` → `title="Total Darurat"`.

- [ ] **Step 4: README status mentions**

Replace `(Normal / Waspada / Hipoksia)` with `(Normal / Waspada / Darurat)` in the feature list, and in the simulator paragraph replace `ke rentang Waspada/Hipoksia` with `ke rentang Waspada/Darurat` (both occurrences: CLI paragraph and any other). Leave `episode hipoksia` phrasing (medical event term) as is.

- [ ] **Step 5: Verify + commit**

Run: `npm run lint` → exit 0; `npm test` → 26 pass.

```powershell
git add lib/format.js lib/telemetry.shared.mjs components/views/DashboardView.jsx components/views/AlertView.jsx README.md
git commit -m "feat: rename displayed alert status Hipoksia to Darurat, add chart colors per status"
```

---

### Task 2: Chart color by status + Y-axis tens

**Files:**
- Modify: `components/views/DashboardView.jsx` (`Rso2TrendChart`, `DashboardView`)

**Interfaces:**
- Consumes: `statusOf(status).chart` from Task 1.

- [ ] **Step 1: `Rso2TrendChart` — status-driven color**

Signature: `function Rso2TrendChart({ history, rollup, critical })` → `function Rso2TrendChart({ history, rollup, alertStatus })`
Color line: `const color = critical ? "#dc2626" : "#0f766e";` → `const color = statusOf(alertStatus).chart;`
(`statusOf` is already imported in this file.)

- [ ] **Step 2: Y-axis**

In `Rso2TrendChart`'s `<YAxis ...>`: replace `domain={[0, 100]}` with `domain={[10, 100]}` and `ticks={[0, 25, 50, 75, 100]}` with `ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}`.

- [ ] **Step 3: `DashboardView` — pass status + recolor RSO2 GINJAL card**

`const rso2Color = critical ? "#dc2626" : "#0f766e";` → `const rso2Color = statusOf(current.alertStatus).chart;`
In the "RSO2 Ginjal" StatCard: `iconColor={critical ? "#dc2626" : "#6b7280"}` → `iconColor={rso2Color}` (keep `danger={critical}`).
Chart call site: `<Rso2TrendChart history={history} rollup={rollup} critical={critical} />` → `<Rso2TrendChart history={history} rollup={rollup} alertStatus={current.alertStatus} />`

- [ ] **Step 4: Verify + commit**

Run: `npm run lint` → exit 0; `npm test` → 26 pass.
Browser (frontend + backend running): Dashboard panel shows "Darurat"; start simulation → chart/average green at NORMAL, turns yellow/red during dips (or check with a WASPADA-range mosquitto payload); Y-axis reads 10..100.

```powershell
git add components/views/DashboardView.jsx
git commit -m "feat: chart color follows alert status, Y-axis fixed to tens 10-100"
```
