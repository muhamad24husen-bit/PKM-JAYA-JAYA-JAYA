# NIRWANA-AI Monitoring Dashboard

Dashboard monitoring realtime untuk **NIRWANA-AI** — purwarupa alat riset yang mengestimasi **rSO₂ (Renal Tissue Oxygen Saturation) ginjal neonatus** memakai sensor NIR eksperimental berbasis ESP32, dikirim ke dashboard lewat MQTT.

> ⚠️ **Catatan penting:** Ini adalah purwarupa untuk keperluan riset/PKM dan pengujian laboratorium. Data dan interpretasi (termasuk AI Insight) **belum digunakan sebagai dasar diagnosis klinis**.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Konfigurasi (.env)](#konfigurasi-env)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Menguji Tanpa Alat Fisik](#menguji-tanpa-alat-fisik)
- [Struktur Folder](#struktur-folder)
- [Fitur AI Insight (NVIDIA NIM)](#fitur-ai-insight-nvidia-nim)
- [Export PDF Riwayat Data](#export-pdf-riwayat-data)
- [Troubleshooting](#troubleshooting)

---

## Fitur Utama

- Koneksi realtime ke perangkat lewat **MQTT** (broker Mosquitto), diteruskan ke browser lewat **Server-Sent Events (SSE)**.
- Dashboard ringkasan: nilai rSO₂ terkini, status peringatan (Normal / Waspada / Darurat), grafik rSO₂ dengan **dropdown jendela waktu** (3 Menit live / 1 Jam / 6 Jam / 24 Jam / 72 Jam) plus garis **baseline** dari 10 menit pertama sesi.
- Halaman **Monitoring Realtime**: grafik RED/IR raw signal dan rSO₂ secara langsung.
- **Riwayat Data**: tabel (desktop) / kartu (mobile), tersimpan di `localStorage` dan cache backend, bisa **Export PDF** dan **Clear History**.
- **AI Insight**: interpretasi singkat berbahasa Indonesia dari kondisi terkini, dihasilkan otomatis oleh LLM lewat **NVIDIA NIM API**.
- Tampilan responsif desktop & mobile, sidebar collapsible.

## Arsitektur Sistem

```
ESP32 (sensor AS7263) --MQTT--> Mosquitto broker --MQTT--> Backend bridge (Express)
                                                                  │
                                                                  ├── REST API (/api/telemetry/*, /api/insight/*)
                                                                  ├── SSE stream (/api/telemetry/stream)
                                                                  └── Panggil NVIDIA NIM API tiap N detik → AI Insight
                                                                          │
                                                                   Next.js dashboard (browser)
```

- **`server/mqtt-bridge.mjs`** — subscribe ke topic MQTT, validasi & normalisasi payload, simpan riwayat (maks 500 data) ke `server/data/history.json`, broadcast ke frontend lewat SSE. Juga menghasilkan AI Insight secara periodik dari NVIDIA NIM API.
- **`server/rollup.mjs`** — agregat rSO₂ rata-rata per menit (retensi 72 jam) ke `server/data/rollup.json`, disajikan lewat `GET /api/telemetry/rollup` untuk dropdown jendela waktu di Dashboard (jendela 1 Jam–72 Jam + baseline sesi).
- **`lib/telemetry.shared.mjs`** — logic normalisasi telemetry yang dipakai bareng oleh backend & frontend.
- **`app/page.js`** — client utama: konek ke SSE, routing antar 6 halaman via sidebar (state, bukan URL routing).

## Teknologi yang Digunakan

| Bagian           | Teknologi                     |
| ---------------- | ------------------------------ |
| Frontend         | Next.js (App Router) + React   |
| Styling          | Tailwind CSS                   |
| Grafik           | Recharts                       |
| Backend bridge   | Node.js + Express              |
| Komunikasi IoT   | MQTT (MQTT.js)                 |
| MQTT Broker      | Mosquitto                      |
| AI Insight       | NVIDIA NIM (OpenAI-compatible chat completions API) |
| Export PDF       | jsPDF + jsPDF-AutoTable        |
| Mikrokontroler   | ESP32-S3 + sensor AS7263 (NIR spectral sensor) |

## Prasyarat

- **Node.js 18+** (disarankan versi LTS terbaru; proyek ini pakai Express 5 & `fetch` bawaan Node).
- **Mosquitto** (atau MQTT broker lain) yang bisa diakses dari mesin yang menjalankan backend — untuk menerima data dari ESP32.
- (Opsional) **API key NVIDIA NIM** dari [build.nvidia.com](https://build.nvidia.com) kalau mau mengaktifkan fitur AI Insight.

## Instalasi

```bash
git clone <url-repo-ini>
cd PKM-JAYA-JAYA-JAYA
npm install
```

## Konfigurasi (.env)

Salin `.env.example` menjadi `.env`, lalu sesuaikan:

```bash
cp .env.example .env
```

| Variabel                | Default                     | Keterangan                                                        |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------ |
| `MQTT_URL`               | `mqtt://localhost:1883`      | Alamat broker MQTT yang di-subscribe backend.                     |
| `MQTT_TOPIC`              | `nirwana/telemetry`          | Topic MQTT tempat ESP32 publish data.                             |
| `BACKEND_PORT`            | `4000`                       | Port backend Express.                                             |
| `FRONTEND_ORIGIN`         | `http://localhost:3000`      | Origin yang diizinkan CORS (bisa dipisah koma, atau `*`).         |
| `HISTORY_FILE`            | `server/data/history.json`   | Lokasi file cache riwayat (opsional).                             |
| `ROLLUP_FILE`             | `server/data/rollup.json`    | Lokasi file rollup rSO₂ per menit untuk jendela waktu (opsional). |
| `NVIDIA_API_KEY`          | *(kosong)*                   | API key dari build.nvidia.com. Kosongkan untuk menonaktifkan AI Insight. |
| `NVIDIA_MODEL`            | `meta/llama-3.3-70b-instruct`| Model NVIDIA NIM yang dipakai untuk generate insight.             |
| `INSIGHT_INTERVAL_MS`     | `45000`                      | Interval (ms) antar generate AI Insight.                          |
| `NEXT_PUBLIC_TELEMETRY_API` | `http://localhost:4000`    | URL backend yang diakses browser.                                  |
| `NEXT_PUBLIC_MQTT_TOPIC`  | `nirwana/telemetry`          | Ditampilkan di UI sebagai info topic.                              |
| `NEXT_PUBLIC_PATIENT_*`, `NEXT_PUBLIC_CLINICIAN_*`, `NEXT_PUBLIC_MONITOR_ID` | lihat `.env.example` | Identitas pasien/klinisi yang ditampilkan di dashboard, bisa diganti sesuai kebutuhan demo. |

## Menjalankan Aplikasi

Jalankan **backend** dan **frontend** sekaligus:

```bash
npm run dev:all
```

Atau terpisah di dua terminal:

```bash
npm run backend   # Express + MQTT bridge, http://localhost:4000
npm run dev       # Next.js dev server,   http://localhost:3000
```

Buka **http://localhost:3000** di browser.

> Dashboard tetap bisa dibuka walau belum ada data masuk (menampilkan state kosong), tapi untuk melihat data realtime, backend **harus** berhasil terhubung ke broker MQTT dan menerima payload dari ESP32 (atau alat uji MQTT lain, lihat bagian berikutnya).

### Format Payload MQTT

Backend menerima JSON di topic `MQTT_TOPIC` dengan field (nama field fleksibel, lihat `lib/telemetry.shared.mjs` untuk alias yang didukung):

```json
{
  "deviceId": "nirwana_001",
  "rso2": 68.4,
  "red": 52420,
  "ir": 68360,
  "motion": "STABIL",
  "sqi": 96.2,
  "battery": 91,
  "alertStatus": "NORMAL"
}
```

## Menguji Tanpa Alat Fisik

Gunakan **simulator bawaan** — script opt-in yang mem-publish payload MQTT **asli** ke broker (aplikasi tetap berjalan murni dari data MQTT, bukan mode simulasi internal):

```bash
npm run simulate                     # backfill 26 jam + live 1 Hz
npm run simulate -- --backfill 2    # backfill 2 jam saja + live
npm run simulate -- --backfill 0    # langsung live tanpa backfill
npm run simulate -- --interval 500  # live 2 Hz
```

| Flag | Default | Keterangan |
| ---- | ------- | ---------- |
| `--backfill <jam>` | `26` | Isi riwayat N jam ke belakang (timestamp eksplisit) — mengisi jendela grafik 6/24/72 jam + baseline. `0` = lewati. |
| `--interval <ms>` | `1000` | Periode publish live (minimum 100 ms). |

Pola datanya realistis: gelombang halus di kisaran 62–74%, satu episode hipoksia terjadwal di tengah backfill, dan dip acak sesekali ke rentang Waspada/Darurat saat live. Broker/topic mengikuti `MQTT_URL` / `MQTT_TOPIC` di `.env`. Hentikan dengan `Ctrl+C`. Untuk mengosongkan kembali dashboard, pakai tombol **Clear History** di halaman Riwayat Data.

Simulator juga bisa dijalankan **dari UI**: buka **Pengaturan → Simulasi Data**, pilih isi riwayat (Tanpa / 2 jam / 26 jam), lalu klik **Mulai Simulasi**. Selama simulasi aktif, badge **SIMULASI** tampil di header semua halaman sebagai penanda bahwa data yang mengalir bersifat sintetis. Bila perangkat asli ikut publish pada saat yang sama, datanya akan berbaur.

Alternatif manual — publish payload sendiri dengan `mosquitto_pub`:

```bash
mosquitto_pub -h localhost -t nirwana/telemetry -m '{"deviceId":"nirwana_001","rso2":68.4,"red":52420,"ir":68360,"motion":"STABIL","sqi":96.2,"battery":91,"alertStatus":"NORMAL"}'
```

Atau pakai aplikasi GUI seperti **MQTT Explorer** untuk publish berkala sambil menyesuaikan nilainya secara manual.

## Struktur Folder

```
app/                   Halaman Next.js (App Router)
components/
  ui/                   Komponen dasar (Card, StatusBadge, SummaryCard, AiInsightCard)
  views/                Komponen per halaman (Dashboard, Realtime, History, Alert, Device, Settings)
lib/
  telemetry.js          Re-export lib/telemetry.shared.mjs untuk dipakai di frontend
  telemetry.shared.mjs  Logic normalisasi telemetry (dipakai backend & frontend)
  trend.js              Re-export lib/trend.shared.mjs untuk dipakai di frontend
  trend.shared.mjs      Jendela waktu + agregasi tren rSO₂ (dipakai backend & frontend)
  pdf.js                Generate PDF riwayat data
  format.js             Helper format status/tanggal
  profile.js            Identitas pasien & klinisi (dari .env)
server/
  mqtt-bridge.mjs       Backend Express: subscribe MQTT, REST API, SSE, AI Insight
  rollup.mjs            Store rollup rSO₂ per menit (retensi 72 jam, persist JSON)
tests/                  Unit test (node --test): agregasi tren & rollup store
docs/                   Dokumen desain/spec pengembangan
```

## Fitur AI Insight (NVIDIA NIM)

1. Buat API key gratis di [build.nvidia.com](https://build.nvidia.com) (format `nvapi-...`).
2. Isi `NVIDIA_API_KEY` di `.env`.
3. Jalankan backend (`npm run backend` atau `npm run dev:all`).
4. Begitu ada minimal 1 data telemetry masuk, backend akan mulai generate insight setiap `INSIGHT_INTERVAL_MS` (default 45 detik) dan tampil di card **AI Insight** pada halaman Dashboard.

Catatan: **panggilan pertama ke NVIDIA NIM bisa memakan waktu puluhan detik** (cold start GPU untuk model besar) — ini normal, bukan error. Panggilan berikutnya biasanya jauh lebih cepat. Kalau `NVIDIA_API_KEY` kosong, card AI Insight menampilkan pesan bahwa fitur belum dikonfigurasi, tanpa mengganggu fitur lain.

## Export PDF Riwayat Data

Di halaman **Riwayat Data**, tombol **Export PDF** akan mengunduh laporan monitoring (format landscape, berisi info perangkat, ringkasan, dan tabel riwayat) dengan nama file `NIRWANA-AI_Riwayat-Monitoring_YYYY-MM-DD_HH-mm.pdf`.

## Troubleshooting

| Gejala | Kemungkinan Penyebab |
| ------ | ---------------------- |
| Dashboard menampilkan "Backend telemetry belum tersedia" | Backend (`npm run backend`) belum jalan, atau `NEXT_PUBLIC_TELEMETRY_API` tidak sesuai port backend. |
| Status koneksi selalu "disconnected"/"error" | Broker MQTT (`MQTT_URL`) belum jalan / tidak bisa diakses dari mesin backend. |
| AI Insight tidak muncul | `NVIDIA_API_KEY` kosong di `.env`, backend belum menerima data telemetry sama sekali, atau baru saja start (tunggu satu siklus `INSIGHT_INTERVAL_MS`). |
| Riwayat data hilang setelah refresh | `localStorage` browser mungkin ke-clear, atau cache backend (`server/data/history.json`) terhapus/tidak bisa ditulis. |
