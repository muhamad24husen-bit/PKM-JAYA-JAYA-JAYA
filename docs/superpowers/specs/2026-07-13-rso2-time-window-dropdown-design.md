# Desain: Dropdown Jendela Waktu Grafik rSO₂ (Dashboard)

- **Tanggal:** 2026-07-13
- **Status:** Disetujui untuk implementasi (menunggu review spec)
- **Acuan:** Tabel "Rekomendasi arsitektur waktu" dari diskusi proposal (lapisan Baseline / Live / Trend pendek / Jendela keputusan / Jendela penuh)
- **Cakupan:** Kartu "Grafik rSO₂ Ginjal" di `components/views/DashboardView.jsx` + penyimpanan agregat di backend

---

## 1. Tujuan

Mengganti grafik rSO₂ rata-rata per jam (jendela tunggal) dengan **dropdown jendela waktu berlapis** sesuai arsitektur waktu klinis: satu grafik, beberapa lapis jendela yang bisa dipilih, masing-masing dengan resolusi agregasi yang tepat, plus **garis baseline** sebagai patokan referensi.

Masalah teknis inti yang dipecahkan: riwayat saat ini dibatasi `HISTORY_LIMIT = 500` sampel (~8 menit @ 1 Hz) di frontend dan backend, sehingga jendela 6/24/72 jam mustahil dari data mentah. Solusi: **rollup rata-rata per menit di backend** (keputusan brainstorming, Pendekatan A).

## 2. Keputusan brainstorming (mengikat)

| Keputusan | Pilihan |
|---|---|
| Isi dropdown | Gabungan: 3 Menit (live mentah), 1 Jam, 6 Jam, **24 Jam (default)**, 72 Jam + garis baseline |
| Penyimpanan data panjang | Rollup per menit di backend, retensi 72 jam, endpoint baru |
| Data belum cukup | **Jujur + parsial**: tampilkan titik nyata yang ada + keterangan cakupan; generator data dummy dihapus |

## 3. Definisi jendela waktu

| Key | Label dropdown | Jendela | Resolusi | Maks titik | Sumber |
|---|---|---|---|---|---|
| `3m` | 3 Menit (Live) | 180 detik terakhir | sampel mentah 1 Hz | ~180 | state `history` (mentah) |
| `1h` | 1 Jam | 60 menit terakhir | *moving average* 5 menit, digeser per menit | ~60 | rollup menit |
| `6h` | 6 Jam | 6 jam terakhir | rata-rata 15 menit | 24 | rollup menit |
| `24h` | 24 Jam **(default)** | 24 jam terakhir | rata-rata 30 menit | 48 | rollup menit |
| `72h` | 72 Jam | 72 jam terakhir | rata-rata per jam | 72 | rollup menit |

- Bucket *tumbling* (6h/24h/72h): kunci bucket = `floor(t / bucketMs) * bucketMs`; nilai = rata-rata berbobot `count` dari bucket menit di dalamnya.
- *Moving average* (1h): untuk tiap menit `m` dalam jendela yang punya data pada rentang `[m - 4 menit, m]`, titik = rata-rata berbobot bucket menit di rentang itu. Celah data dibiarkan kosong (tidak diinterpolasi).
- Format label sumbu-X: `HH:MM:SS` (3m), `HH:MM` (1h/6h/24h), `DD/MM HH:00` (72h).

## 4. Baseline

- **Definisi:** rata-rata berbobot rSO₂ dari bucket menit dalam **10 menit pertama sesi** (`[sessionStartedAt, sessionStartedAt + 10 menit)`).
- **Terbentuk** hanya setelah ≥ 10 menit berlalu sejak `sessionStartedAt` **dan** ada ≥ 1 bucket valid di rentang itu; sebelum itu `baseline = null` dan garis tidak digambar.
- **Sesi:** `sessionStartedAt` = timestamp telemetri pertama saat rollup kosong. Bertahan melewati restart backend (ikut dipersist). Dihapusnya riwayat (`DELETE /api/telemetry/history`) me-reset sesi + rollup.
- Digambar sebagai `ReferenceLine` putus-putus berlabel `Baseline {nilai}%` di semua jendela, menggantikan garis statis `y=65` yang sekarang.
- **Satu sumber logika:** perhitungan baseline adalah fungsi murni `computeBaseline(buckets, sessionStartedAt, now)` di `lib/trend.shared.mjs`, di-import oleh **backend** (untuk `snapshot()`) dan **frontend** (untuk `buildTrendSeries`) — tidak ada duplikasi rumus. Frontend menghitung ulang dari bucket lokalnya sehingga baseline tetap terbentuk walau halaman dibuka sebelum menit ke-10.
- *Penyederhanaan yang disadari:* sinyal "probe stabil" belum ada di dashboard; anchor 10 menit pertama sesi adalah aproksimasi pragmatisnya. Tombol *recapture* baseline = di luar cakupan (catatan fase berikut).

## 5. Backend — modul rollup

**Modul baru `server/rollup.mjs`** (pola meniru persistensi riwayat di `mqtt-bridge.mjs`):

```js
createRollupStore({ filePath, retentionMs = 72j, persistDelayMs = 1000 })
→ { load(), add(item), clear(), snapshot(now?), flush() }
```

- Struktur internal: `Map<menitEpoch, { sum, count }>` untuk `rso2` + `sessionStartedAt`.
- `add(item)`: ambil menit dari `item.timestamp` (fallback waktu kini), tambah `sum/count`, set `sessionStartedAt` bila null, buang bucket lebih tua dari `now - retentionMs`, jadwalkan persist (debounce 1 detik — pola sama dengan riwayat).
- `snapshot(now)`: payload endpoint (bucket urut naik; baseline via `computeBaseline` dari `lib/trend.shared.mjs` — konstanta jendela baseline `BASELINE_WINDOW_MS = 10 menit` hidup di sana; otomatis "beku" karena bucket lama tak berubah).
- Persist ke JSON: path via env **`ROLLUP_FILE`**, default `server/data/rollup.json` (folder sudah di-gitignore). Bentuk file: `{ sessionStartedAt, buckets: { "<menitEpoch>": { sum, count } } }`. `load()` saat boot; `flush()` saat shutdown/clear.

**Perubahan `server/mqtt-bridge.mjs`:**
- `addTelemetry(item)` → juga `rollup.add(item)`.
- Endpoint baru **`GET /api/telemetry/rollup`** →
  `{ sessionStartedAt, baseline: { value, from, to } | null, buckets: [{ t, avg, count }] }`.
- `DELETE /api/telemetry/history` → juga `rollup.clear()`.
- `shutdown()` → juga `rollup.flush()`.
- Tidak ada event SSE baru: frontend meng-update rollup-nya sendiri dari event `telemetry` yang sudah ada.

## 6. Frontend — aliran data

**Modul baru `lib/trend.shared.mjs`** (+ `lib/trend.js` re-export, meniru pola `telemetry.shared.mjs`/`telemetry.js`) — semua fungsi murni:

- `TREND_WINDOWS`: definisi §3 (key, label, subLabel, windowMs, bucketMs, source, movingAverage).
- `buildTrendSeries({ windowKey, history, rollup, now })` → `{ points: [{ t, label, rso2 }], average, baseline, coverageMs, windowMs }`. `average` = rata-rata berbobot seluruh data dalam jendela (angka besar "RATA-RATA" di header kartu).
- `mergeRollupSample(rollup, item)` → rollup baru dengan sampel telemetri masuk ke bucket menitnya (rekonstruksi `sum = avg × count`); set `sessionStartedAt` lokal bila null. Menerima `rollup = null` (fetch awal gagal) dan memperlakukannya sebagai rollup kosong, sehingga jendela panjang tetap terisi perlahan dari SSE.

**`app/page.js`:**
- State baru `rollup` (awal `null`).
- Fetch `GET /api/telemetry/rollup` saat mount (pola sama dengan fetch riwayat; gagal → biarkan `null`, tanpa crash).
- Handler SSE `telemetry` → `setRollup(mergeRollupSample(...))`; handler `history-clear` → reset `rollup` ke sesi kosong.
- Oper `rollup` ke `DashboardView`.

**`components/views/DashboardView.jsx`:**
- `Rso2HourlyChart` → **`Rso2TrendChart`**; menerima `{ history, rollup, critical }`, punya state `windowKey` sendiri (default `"24h"`), hitung `buildTrendSeries` via `useMemo`.
- `<select>` native di header kartu (samping angka rata-rata), gaya tema clinical-minimal: `text-xs font-semibold`, border `nirwana-border`, latar putih, radius 8px, fokus ring `nirwana-accent`.
- Subjudul kartu dinamis, mis. "Rata-rata 30 menit · 24 jam terakhir". Tooltip menyesuaikan format waktu jendela.
- Memo `hourlyTrend` lama + generator data dummy **dihapus** dari `DashboardView`.

## 7. Data belum cukup & error

- `points.length < 2` → area grafik diganti pesan kosong rapi: *"Belum ada data untuk jendela ini."*
- `points.length ≥ 2` tapi cakupan < 95% jendela → grafik digambar parsial + keterangan kecil: *"Data baru mencakup ~X dari Y."* — satuan menyesuaikan jendela (menit untuk `3m`/`1h`, jam untuk `6h`/`24h`/`72h`), nilai dari `coverageMs` (`now − timestamp titik tertua`, dibatasi `windowMs`).
- Fetch rollup gagal / backend mati → jendela `3m` tetap hidup dari riwayat mentah; jendela rollup menampilkan pesan kosong; tanpa crash.
- Semua nilai non-numerik/timestamp rusak dilewati (guard `Number.isFinite`, pola yang sudah ada).

## 8. Pengujian & verifikasi

- **Unit (`node --test`, tanpa dependensi baru):** `tests/trend.shared.test.mjs` (tumbling bucket, moving average, baseline terbentuk/belum, average berbobot, coverage, jendela kosong, mergeRollupSample) dan `tests/rollup.test.mjs` (add/prune retensi, sessionStartedAt, snapshot baseline, persist→load pulih, clear). Script npm baru: `"test": "node --test tests/"`.
- **Manual:** jalankan backend + publisher MQTT dummy (cara di README), cek kelima jendela, baseline muncul setelah 10 menit, hapus riwayat me-reset semuanya, reload halaman mempertahankan data rollup.

## 9. File tersentuh

- **Baru:** `server/rollup.mjs`, `lib/trend.shared.mjs`, `lib/trend.js`, `tests/rollup.test.mjs`, `tests/trend.shared.test.mjs`
- **Ubah:** `server/mqtt-bridge.mjs`, `app/page.js`, `components/views/DashboardView.jsx`, `package.json` (script `test`), `.env.example` (`ROLLUP_FILE`), `README.md` (endpoint & fitur baru, singkat)

## 10. Di luar cakupan

Tombol recapture baseline; band min/max pada grafik; perubahan RealtimeView/HistoryView/PDF/AI Insight; broadcast rollup via SSE; TypeScript.
