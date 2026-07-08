# Dashboard Redesign + AI Insight (NVIDIA NIM) — Design

Date: 2026-07-08

## Goal

Ganti visual dashboard NIRWANA-AI dari gaya dark/neon "AI-generated-looking" (glow, grid decorative, drop-shadow di mana-mana) jadi **clinical minimal**: latar terang, satu warna aksen, flat card, tipografi bersih — tetap informatif untuk penilaian lomba PKM, plus tambah fitur **AI Insight** yang benar-benar menunjukkan pemakaian LLM (bukan tempelan).

## Scope

Semua 6 halaman (Dashboard, Realtime, Riwayat Data, Alert, Perangkat, Pengaturan) + Sidebar/MobileNavigation/TopAppBar direstyle ke sistem desain baru. Ditambah 1 fitur baru: AI Insight card di halaman Dashboard.

## 1. Visual System

- **Palet baru** di `tailwind.config.js` (ganti token `nirwana.*` dari dark ke light):
  - `background`: `#f6f7f8` (page), `surface`: `#ffffff` (card), `border`: `#e4e7eb`
  - `text`: `#14181b`, `muted`: `#6b7280`
  - `accent`: `#0f766e` (teal — lanjutan dari teal lama `#008080`, kontras cukup di atas putih)
  - status: `normal` hijau (`#16a34a`), `waspada` amber (`#d97706`), `hipoksia` merah (`#dc2626`), masing-masing dengan tint `-50`/`-100` untuk background lembut
- **Hapus semua efek dekoratif**: `text-shadow`/glow, `boxShadow` neon, grid background (`.chart-grid`, `.dashboard-grid`, `.realtime-chart-grid`), watermark "Live Waveform", `backdrop-blur` berlebihan, `animate-pulse` dipakai hanya untuk indikator koneksi live (bukan di semua card).
- **Komponen primitif baru** (`components/ui/`): `Card.jsx` (wrapper flat: border tipis + rounded + padding konsisten) dan `SectionHeading.jsx` (label section konsisten). `StatusBadge` dan `SummaryCard` direstyle memakai token baru, hilangkan efek glow/pulse dari situ.
- Semua view (`DashboardView`, `RealtimeView`, `HistoryView`, `AlertView`, `DeviceView`, `SettingsView`, `Sidebar`, `MobileNavigation`, `TopAppBar`) diupdate memakai token + primitif baru, hardcoded hex class dihapus.
- Chart (recharts) tetap dipakai, tapi grid/garis pakai warna abu muda, hilangkan `drop-shadow` filter dan gradient glow berlebihan pada `<Area>`/`<Line>`.

## 2. AI Insight Feature

- **Isi**: 1-2 kalimat Bahasa Indonesia yang menginterpretasi kondisi terkini berdasarkan histori terbaru (contoh: "rSO2 stabil di 68% selama 10 menit terakhir, tidak ada indikasi hipoksia. Kualitas sinyal baik.").
- **Lokasi**: hanya di halaman Dashboard, satu card baru `AiInsightCard`.
- **Trigger**: backend (`server/mqtt-bridge.mjs`) punya timer (`setInterval`, default 45 detik, configurable via `INSIGHT_INTERVAL_MS`) yang memanggil NVIDIA NIM API pakai window histori terbaru, simpan hasil di memori, lalu broadcast lewat SSE stream yang sudah ada (`event: insight`). Frontend cuma dengar event ini — tidak polling sendiri, jadi berapa pun tab dibuka tetap 1 request per interval ke NVIDIA.
- **API**: NVIDIA NIM, endpoint `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI-compatible), header `Authorization: Bearer <NVIDIA_API_KEY>`, model default `meta/llama-3.3-70b-instruct` (configurable via `NVIDIA_MODEL`), `stream:false`, `max_tokens` kecil (~150) karena cuma butuh 1-2 kalimat.
- **Prompt**: system prompt jelasin konteks (device monitoring rSO2 neonatus, prototipe riset, bukan alat diagnosis), lalu data ringkas (rso2 saat ini, status alert, SQI, tren rata-rata beberapa menit terakhir dari histori) sebagai user message, minta output singkat 1-2 kalimat Bahasa Indonesia gaya klinis netral.
- **Graceful degradation**: kalau `NVIDIA_API_KEY` belum diisi di `.env`, timer insight tidak jalan sama sekali (skip, log sekali di startup) dan frontend menampilkan pesan "AI Insight belum dikonfigurasi" — bukan error/crash. Kalau API call gagal (network/rate limit), insight lama tetap ditampilkan + label kecil "gagal diperbarui", server tidak boleh crash.
- **Endpoint tambahan**: `GET /api/insight/latest` untuk state awal saat frontend baru connect/reconnect (pola sama seperti `/api/telemetry/latest`).
- **Env baru** (`.env.example`): `NVIDIA_API_KEY`, `NVIDIA_MODEL` (default `meta/llama-3.3-70b-instruct`), `INSIGHT_INTERVAL_MS` (default `45000`).

## Non-goals

- Tidak bikin chat assistant interaktif (di luar scope permintaan sekarang).
- Tidak menambah dependency SDK baru — pakai `fetch` bawaan Node (sudah tersedia di Node 18+, sesuai `express@5` yang butuh Node modern), cukup untuk 1 REST call OpenAI-compatible.
- Tidak mengubah logic MQTT/telemetry yang sudah ada, hanya menambah jalur insight paralel.

## Verifikasi

- Format request/response NVIDIA NIM API sudah dicek langsung ke dokumentasi resmi (docs.api.nvidia.com) sebelum implementasi, bukan tebakan.
