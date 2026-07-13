# Desain: Simulator Data MQTT (`npm run simulate`)

- **Tanggal:** 2026-07-13
- **Status:** Disetujui untuk implementasi (menunggu review spec)
- **Tujuan:** Menghidupkan kembali kemampuan uji tanpa alat fisik — kini sebagai **script publisher MQTT opt-in**, bukan mode built-in aplikasi — terutama untuk menguji grafik rSO₂ dengan dropdown jendela waktu (3 Menit–72 Jam) + baseline.
- **Prinsip:** Kode aplikasi (backend/frontend) tidak disentuh; data mengalir lewat jalur produksi asli broker → `mqtt-bridge` → rollup → SSE → grafik. Catatan README bahwa aplikasi "selalu jalan dari data MQTT asli" tetap benar.

## 1. Keputusan brainstorming (mengikat)

| Keputusan | Pilihan |
|---|---|
| Bentuk fitur | Script publisher MQTT (`scripts/simulate.mjs` + `npm run simulate`) |
| Cakupan | **Backfill + live**: isi riwayat N jam ke belakang lalu streaming 1 Hz |
| Di luar cakupan | Mode simulasi built-in backend; preset `--scenario`; perubahan UI |

## 2. Antarmuka CLI

```bash
npm run simulate                     # backfill 26 jam + live 1 Hz (default)
npm run simulate -- --backfill 2    # backfill 2 jam + live
npm run simulate -- --backfill 0    # tanpa backfill, langsung live
npm run simulate -- --interval 500  # periode live 500 ms (2 Hz)
npm run simulate -- --help          # usage
```

- `--backfill <jam>` — default **26**; `0` melewati backfill. Nilai bukan angka ≥ 0 → tampilkan usage, exit 1.
- `--interval <ms>` — default **1000**; minimum 100.
- Broker/topic dari env yang sama dengan backend: `MQTT_URL`, `MQTT_TOPIC` (dotenv), default `DEFAULT_MQTT_URL` / `DEFAULT_TOPIC` dari `lib/telemetry.shared.mjs`.
- `Ctrl+C` → `client.end()` bersih + cetak ringkasan jumlah pesan terkirim.

## 3. Pola data

**Backfill** (sekali di awal, publish cepat ±15 ms antar pesan):
- 1 sampel per menit dari `now − backfillJam` sampai `now − 1 menit`, **timestamp eksplisit** di payload, urut **tertua → terbaru** (kritis: pesan pertama menentukan `sessionStartedAt` dan baseline di rollup backend).
- 10 menit pertama diberi nilai stabil 66–68% (tetap 1 sampel/menit) agar baseline yang terbentuk masuk akal.
- Kurva dasar: sinus periode ~6 jam, rentang 62–74%, + noise ±0.8.
- **Satu episode hipoksia terjadwal** di tengah rentang backfill: ~20 menit turun bertahap ke ~52% lalu pulih — memberi bentuk menarik di jendela 6/24 jam dan menguji status HIPOKSIA/WASPADA di riwayat.

**Live** (setelah backfill, tiap `--interval` ms, **tanpa** field timestamp — backend memakai jam server):
- Nilai dasar ~68% + gelombang halus (sinus ~90 detik) + noise ±0.6, random walk pelan.
- Episode dip acak: tiap 2–5 menit, penurunan 30–60 detik ke rentang 52–60% lalu pulih.

**Field payload** (format persis README / `normalizeTelemetry`):

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

- `red`/`ir`: dasar 52000/68000 ± noise, digeser searah rso2 (korelasi kasar).
- `motion`: `"TERDETEKSI"` pada ~3% sampel, selainnya `"STABIL"`; saat terdeteksi `sqi` turun ke 80–90.
- `sqi`: normal 92–99.
- `battery`: fungsi deterministik dari waktu — `clamp(95 − (t − tAwalSesi)/30menit, 20, 95)` (turun ~1% per 30 menit sejak awal sesi backfill; floor 20).
- `alertStatus` diturunkan dari rso2 — **ambang milik simulator** (frontend hanya menampilkan status dari payload): `NORMAL ≥ 65`, `WASPADA 55–64.9`, `HIPOKSIA < 55`.

## 4. Struktur kode

- **`scripts/simulate.gen.mjs`** — fungsi murni, tanpa I/O, bisa diunit-test:
  - `alertStatusFor(rso2) → "NORMAL"|"WASPADA"|"HIPOKSIA"`
  - `buatSampel(tMs, state) → { payload, state }` — satu payload **tanpa field `timestamp`** + state berikutnya (fase gelombang, episode dip). Field `timestamp` ditambahkan oleh entry CLI **hanya** pada loop backfill; sampel live dikirim tanpa timestamp (backend memakai jam server).
  - `deretBackfill(nowMs, jam) → number[]` — daftar timestamp menit, urut naik
- **`scripts/simulate.mjs`** — entry CLI: parsing flag, dotenv, koneksi MQTT (connectTimeout 5 detik), loop backfill lalu `setInterval` live, handler SIGINT.
- **`tests/simulate.test.mjs`** (node:test): ambang `alertStatusFor` (65/55/batas), `deretBackfill` (jumlah = jam×60, urut naik, semua < now), payload `buatSampel` lolos `normalizeTelemetry` (rso2/sqi/battery numerik, alertStatus konsisten ambang).
- `package.json`: script `"simulate": "node scripts/simulate.mjs"`.

## 5. Penanganan error

- Broker tak terjangkau (event `error`/timeout): cetak `Broker MQTT tidak bisa dihubungi di <url> — jalankan Mosquitto dulu.` lalu exit 1 (jangan retry-loop diam-diam saat startup).
- Flag tidak valid → cetak usage, exit 1.
- Kegagalan publish saat live → warning ke console, lanjut (mqtt.js auto-reconnect menangani putus koneksi sementara).

## 6. Dokumentasi

README bagian **"Menguji Tanpa Alat Fisik"** ditulis ulang: `npm run simulate` jadi cara utama (dengan tabel flag + contoh), `mosquitto_pub` dipertahankan sebagai alternatif manual. Ditegaskan simulator adalah script opt-in yang publish MQTT asli, bukan mode aplikasi.

## 7. Verifikasi

1. `npm test` — semua lulus (termasuk test simulator baru).
2. `npm run simulate -- --backfill 2` dengan backend jalan: `GET /api/telemetry/rollup` berisi ±120 bucket, `sessionStartedAt` ≈ 2 jam lalu, baseline terisi.
3. Browser: kelima jendela dropdown menampilkan data (24/72 jam parsial + keterangan cakupan), garis baseline muncul, episode hipoksia terlihat di jendela 6 jam, panel Status Peringatan berubah saat dip live.
4. `Ctrl+C` → ringkasan tercetak, proses exit 0, backend tetap sehat.
