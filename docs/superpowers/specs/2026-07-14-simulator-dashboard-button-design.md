# Desain: Kontrol Simulasi dari Dashboard (Start/Stop + Badge)

- **Tanggal:** 2026-07-14
- **Status:** Disetujui untuk implementasi (user memilih "lanjut sampai selesai")
- **Tujuan:** Simulator data (saat ini hanya CLI `npm run simulate`) bisa dimulai/dihentikan dari UI dashboard, dengan penanda global yang jujur saat data sintetis sedang mengalir.
- **Lanjutan dari:** `docs/superpowers/specs/2026-07-13-data-simulator-design.md`

## 1. Keputusan brainstorming (mengikat)

| Keputusan | Pilihan |
|---|---|
| Penempatan kontrol | Kartu **"Simulasi Data"** di halaman **Pengaturan** + **badge global "SIMULASI"** saat aktif |
| Kontrol | **Start/Stop + pilihan backfill** (Tanpa / 2 jam / 26 jam, default 2 jam); interval tetap 1 detik |
| Arsitektur | **Runner in-process di backend** (Pendekatan A) — publish lewat client MQTT bridge ke broker asli; CLI tetap ada, berbagi `scripts/simulate.gen.mjs` |

## 2. Backend — `server/simulator.mjs` (modul baru)

```js
createSimulatorRunner({ publish, onUpdate = () => {}, backfillDelayMs = 15, intervalMs = 1000 })
→ { start({ backfillHours }), stop(), status() }
```

- **`start({ backfillHours })`**: tolak bila sudah berjalan (return `{ error }`). Set `running=true`, `phase="backfill"`, `startedAt=ISO now`, `sent=0`. Jalankan loop backfill async: `deretBackfill(now, backfillHours)` → `buatSampel(ts, state)` → `publish({ ...payload, timestamp: iso(ts) })`, jeda `backfillDelayMs`; cek flag `cancelled` tiap iterasi. Selesai → `phase="live"` + panggil `onUpdate` (lihat §3) → `setInterval(intervalMs)`: `buatSampel(Date.now(), state)` → `publish(payload)` **tanpa** timestamp. `backfillHours = 0` langsung ke fase live. `onUpdate(status())` dipanggil pada tiap transisi fase **dan tiap 60 pesan live** agar hitungan `sent` di UI tetap segar lewat SSE `status`.
- **`stop()`**: idempoten. Set `cancelled`, clearInterval, `running=false`, `phase="idle"`. Return `status()`.
- **`status()`**: `{ running, phase: "idle"|"backfill"|"live", startedAt, sent, backfillHours }` (saat idle: `startedAt=null`, `backfillHours=null`; `sent` = hitungan sesi terakhir).
- State generator (`buatStateAwal`) dibuat per start — sesi backfill/episode hipoksia identik dengan CLI.
- Opsi `onUpdate(status)` callback (dipakai bridge untuk broadcast; default no-op).

## 3. Wiring `server/mqtt-bridge.mjs`

- `const simulator = createSimulatorRunner({ publish: (payload) => mqttClient.publish(topic, JSON.stringify(payload)), onUpdate: () => broadcastStatus() });`
  Publish ke topic yang sama → broker mengirim balik ke subscription bridge → seluruh jalur produksi (normalisasi, riwayat, rollup, SSE) tetap teruji.
- `statusPayload()` + field **`simulation: simulator.status()`** → ikut event SSE `status` yang sudah ada. **Tidak ada event SSE baru.**
- **`POST /api/simulate/start`** — body `{ backfillHours }`: wajib angka `0–72` (400 bila bukan); **409** `{ error: "Simulasi sudah berjalan." }` bila running; **409** `{ error: "Broker MQTT tidak terhubung." }` bila `brokerStatus !== "connected"`. Sukses → `202 { simulation }` + `broadcastStatus()`.
- **`POST /api/simulate/stop`** — selalu `200 { simulation }` + `broadcastStatus()` (idempoten).
- `shutdown()` → `simulator.stop()`.

## 4. Frontend

- **`app/page.js`**: state baru `simulation` diisi dari handler SSE `status` yang sudah ada (`payload.simulation ?? null`). Handler `simulateStart(backfillHours)` / `simulateStop()` → `fetch` POST ke endpoint §3; kegagalan → pesan error dikembalikan ke pemanggil (SettingsView menampilkannya; pola `buildApiUrl` yang ada). Props diteruskan: `simulation` + kedua handler ke `SettingsView`; `simulation` ke `TopAppBar` dan `RealtimeView`.
- **`components/ui/SimulationBadge.jsx`** (baru): chip kuning kecil `SIMULASI` (border/teks `nirwana-waspada`, ikon `FlaskConical` lucide, `animate-pulse` pada titiknya); render `null` bila `!simulation?.running`. Dipasang di: **TopAppBar** (klaster kanan, sebelum blok status) dan **RealtimeHeader** (grup kanan, sebelum chip Online).
- **`components/views/SettingsView.jsx`**: kartu baru **"Simulasi Data"** di bawah kartu yang ada:
  - Status: `Nonaktif` / `Aktif — fase backfill/live · N pesan terkirim · sejak HH:MM`.
  - `<select>` "Isi riwayat dulu": `Tanpa (0)` / `2 jam` (default) / `26 jam` — disabled saat berjalan.
  - Tombol **Mulai Simulasi** (accent; disabled saat berjalan) / **Hentikan Simulasi** (outline merah; hanya saat berjalan).
  - Baris pesan error (mis. broker tidak terhubung / backend mati) — teks kecil `nirwana-hipoksia`.
  - Catatan kejujuran: *"Data simulasi bersifat sintetis untuk pengujian — bukan pembacaan sensor. Kosongkan lewat Riwayat Data → Clear History."*
  - SettingsView menambah state lokal kecil (pilihan backfill, pesan error, flag sedang-mengirim); props baru: `{ simulation, onSimulateStart, onSimulateStop }` (handler mengembalikan pesan error atau string kosong).

## 5. Error & kasus tepi

- Backend mati saat klik → fetch gagal → pesan "Backend tidak dapat dihubungi." di kartu.
- Backend restart saat simulasi jalan → simulator mati bersama proses; SSE `status` berikutnya membawa `simulation.running=false` — UI pulih sendiri.
- Simulasi berjalan bersamaan dengan perangkat asli → data berbaur; badge tetap tampil (dicatat di README).
- Hapus riwayat saat simulasi jalan → aman (data baru terus mengalir).

## 6. Pengujian & verifikasi

- **Unit `tests/simulator.test.mjs`** (publish spy, `backfillDelayMs: 0`, `intervalMs: 25`): backfill mem-publish `jam×60` payload ber-timestamp urut naik lalu masuk fase live; payload live tanpa timestamp; `stop()` membatalkan saat backfill & saat live, idempoten; double-start ditolak; `backfillHours: 0` langsung live; bentuk `status()` sesuai §2.
- **E2E (curl + browser)**: start → 202 dan data mengalir; start kedua → 409; body tanpa angka / di luar 0–72 → 400; stop → 200 dan idempoten. Cabang 409 "broker tidak terhubung" adalah guard satu-baris — cukup diverifikasi lewat pembacaan kode. Browser: badge muncul di TopAppBar + header Realtime, kartu Pengaturan menampilkan fase/hitungan, grafik terisi, stop menghentikan aliran & badge hilang. `npm test` + `npm run lint` lulus.

## 7. Dokumentasi

README "Menguji Tanpa Alat Fisik": tambah paragraf bahwa simulator juga bisa dijalankan dari UI (Pengaturan → Simulasi Data; badge SIMULASI tampil selama aktif; data berbaur bila alat asli ikut publish).

## 8. Di luar cakupan

Interval custom di UI; jadwal auto-stop; perubahan CLI `npm run simulate`; autentikasi endpoint simulasi (prototipe lokal).
