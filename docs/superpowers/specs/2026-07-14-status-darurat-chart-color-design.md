# Desain: Label "Darurat", Warna Grafik per Status, Sumbu-Y Puluhan

- **Tanggal:** 2026-07-14
- **Status:** Disetujui (user memilih "lanjut sampai selesai")
- **Cakupan:** Presentasi murni — tidak ada perubahan logika data, kontrak telemetri, backend, maupun simulator.

## 1. Rename tampilan "Hipoksia" → "Darurat" (kunci internal tetap `HIPOKSIA`)

Kunci status `HIPOKSIA` di payload/normalisasi/backend/simulator **tidak berubah** (kontrak dengan firmware). Yang berubah hanya tampilan:

- `lib/format.js` `statusMeta.HIPOKSIA`: `label: "Darurat"`, `header: "DARURAT"` → otomatis menjalar ke StatusBadge, AlertView (Status Saat Ini, riwayat), kartu Status Peringatan Dashboard, dsb.
- `components/views/DashboardView.jsx` `AlertStatusPanel`: item `["HIPOKSIA", "Hipoksia", ShieldAlert]` → label `"Darurat"`.
- `components/views/AlertView.jsx`: judul SummaryCard `"Total Hipoksia"` → `"Total Darurat"`.
- `lib/telemetry.shared.mjs` `normalizeAlertStatus`: tambah alias input `"DARURAT"` → `HIPOKSIA` (firmware boleh mengirim istilah baru).
- **Tidak diubah:** subtitle medis "Monitoring Hipoksia Ginjal Neonatus" (istilah medis, bukan label status); nama token Tailwind `nirwana-hipoksia` (rename token = churn kelas seluruh app tanpa nilai).
- README: penyebutan status "Normal / Waspada / Hipoksia" → "Normal / Waspada / Darurat".

## 2. Warna grafik mengikuti status peringatan

- `statusMeta` diberi field baru **`chart`** (hex garis grafik): `NORMAL: "#16a34a"` (hijau, = token normal), `WASPADA: "#d97706"` (kuning), `HIPOKSIA: "#dc2626"` (merah). Satu sumber warna via `statusOf(status).chart`.
- `Rso2TrendChart`: prop `critical` diganti **`alertStatus`**; `const color = statusOf(alertStatus).chart;` → garis, gradien area, titik, dan angka RATA-RATA mengikuti.
- Kartu "RSO2 GINJAL" di `DashboardView` (angka besar + ikon) memakai pemetaan yang sama agar konsisten saat Waspada.
- Grafik halaman Realtime **di luar cakupan**.

## 3. Sumbu-Y grafik tren: puluhan 10–100%

`Rso2TrendChart` YAxis: `domain={[10, 100]}`, `ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}`. Nilai < 10% praktis tidak terjadi (simulator ≥ 40; konteks klinis jauh di atas 10).

## 4. Verifikasi

- `npm run lint` + `npm test` (26 tes; tidak ada logika berubah — murni presentasi).
- Browser: panel Status Peringatan menampilkan "Darurat"; jalankan simulasi → grafik hijau saat NORMAL, kuning saat WASPADA, merah saat DARURAT (dip simulator melewati ambang); sumbu-Y menampilkan 10–100 per 10; angka RATA-RATA dan kartu RSO2 GINJAL ikut berubah warna.

## 5. Di luar cakupan

Rename kunci status end-to-end; rename token Tailwind `hipoksia`; warna grafik RED/IR & rSO₂ di halaman Realtime; perubahan ambang.
