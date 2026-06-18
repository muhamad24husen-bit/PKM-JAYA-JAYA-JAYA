# REVISI PRD — PENAMBAHAN FITUR EXPORT PDF PADA DATABASE RIWAYAT DATA

## NIRWANA-AI Monitoring Dashboard

---

# 1. Perubahan Utama

Pada revisi ini, fitur **Export PDF** dimasukkan ke dalam modul **Riwayat Data**. Fitur ini digunakan untuk menghasilkan laporan monitoring dari data yang tersimpan pada database riwayat, baik dari *localStorage* pada tahap awal maupun SQLite pada tahap pengembangan berikutnya.

Fitur Export PDF akan membantu tim dalam:

1. Mendokumentasikan hasil monitoring.
2. Menyimpan data pengujian dalam format laporan.
3. Melampirkan hasil uji coba pada laporan PKM.
4. Menunjukkan bukti performa dashboard saat presentasi.
5. Menyusun arsip data monitoring berdasarkan waktu pengambilan data.

---

# 2. Revisi Ruang Lingkup MVP

## 2.1 Fitur yang Masuk Ruang Lingkup MVP

Fitur utama yang wajib dibuat pada versi awal:

1. Halaman utama dashboard.
2. Koneksi ke MQTT broker melalui WebSocket.
3. Tampilan status koneksi MQTT.
4. Kartu nilai rSO₂ ginjal.
5. Kartu RED raw.
6. Kartu IR raw.
7. Kartu *Signal Quality Index*.
8. Kartu *Motion Status*.
9. Kartu baterai.
10. Kartu status peringatan.
11. Grafik rSO₂ *realtime*.
12. Grafik RED dan IR *realtime*.
13. Panel status peringatan.
14. Panel informasi perangkat.
15. Tabel riwayat data untuk desktop.
16. Kartu riwayat data untuk mobile.
17. Penyimpanan riwayat data sementara menggunakan *localStorage*.
18. Tampilan responsif untuk desktop dan mobile.
19. **Export PDF riwayat data monitoring.**

---

# 3. Revisi Teknologi yang Digunakan

Stack teknologi yang digunakan pada tahap awal:

| Bagian                    | Teknologi                     |
| ------------------------- | ----------------------------- |
| *Frontend*                | Next.js + JavaScript          |
| Styling                   | Tailwind CSS                  |
| Komunikasi IoT            | MQTT                          |
| MQTT Broker               | Mosquitto                     |
| MQTT Client Web           | MQTT.js                       |
| Grafik                    | Recharts                      |
| Riwayat Data Awal         | localStorage                  |
| Database Riwayat Lanjutan | SQLite                        |
| Export PDF                | jsPDF + jsPDF AutoTable       |
| Mikrokontroler            | ESP32                         |
| MQTT Client ESP32         | PubSubClient                  |
| Testing MQTT              | MQTT Explorer / mosquitto_pub |

Catatan implementasi:

1. Pada tahap awal, data riwayat disimpan di *localStorage*.
2. Fitur Export PDF mengambil data dari riwayat yang sedang tersimpan.
3. Pada tahap lanjutan, data riwayat dapat dipindahkan ke SQLite.
4. Format PDF dibuat sebagai laporan monitoring sederhana yang siap dilampirkan pada dokumentasi PKM.

---

# 4. Revisi Modul Riwayat Data

Modul Riwayat Data berfungsi untuk menyimpan, menampilkan, dan mengekspor data monitoring NIRWANA-AI.

Data yang disimpan meliputi:

1. Waktu pengambilan data.
2. Device ID.
3. Nilai rSO₂.
4. RED raw.
5. IR raw.
6. Rasio RED/IR.
7. Motion.
8. SQI.
9. Battery.
10. Alert status.

Pada desktop, data ditampilkan dalam bentuk tabel. Pada mobile, data ditampilkan dalam bentuk kartu agar tetap responsif.

---

# 5. Fitur Export PDF

## 5.1 Deskripsi Fitur

Fitur Export PDF digunakan untuk mengubah data riwayat monitoring menjadi file PDF. File PDF tersebut berisi informasi perangkat, ringkasan monitoring, dan tabel riwayat data.

Fitur ini akan ditempatkan pada halaman atau card **Riwayat Data** dalam bentuk tombol:

```text
Export PDF
```

Ketika tombol ditekan, sistem akan mengambil data riwayat yang tersimpan, menyusun format laporan, lalu mengunduh file PDF secara otomatis.

---

## 5.2 Isi Laporan PDF

Laporan PDF minimal berisi:

1. Judul laporan.
2. Nama sistem: NIRWANA-AI Monitoring Dashboard.
3. Device ID.
4. Mode pengujian: Prototype.
5. Tanggal export.
6. Jumlah data yang diekspor.
7. Nilai rSO₂ terakhir.
8. Status peringatan terakhir.
9. Tabel riwayat data.

Format tabel PDF:

| No | Waktu | rSO₂ (%) | RED | IR | Ratio | Motion | SQI (%) | Battery (%) | Status |
| -- | ----- | -------- | --- | -- | ----- | ------ | ------- | ----------- | ------ |

---

## 5.3 Nama File PDF

Format nama file PDF:

```text
NIRWANA-AI_Riwayat-Monitoring_YYYY-MM-DD_HH-mm.pdf
```

Contoh:

```text
NIRWANA-AI_Riwayat-Monitoring_2026-06-14_09-20.pdf
```

---

## 5.4 Format Tampilan PDF

PDF menggunakan tampilan formal dan rapi dengan struktur:

```text
NIRWANA-AI Monitoring Report

Device ID       : nirwana_001
Mode            : Prototype
Koneksi         : MQTT / WiFi
Tanggal Export  : 14 Juni 2026
Jumlah Data     : 20 data
Status Terakhir : NORMAL

Tabel Riwayat Data
```

Pada bagian bawah PDF ditambahkan catatan:

```text
Catatan: Data pada laporan ini berasal dari purwarupa NIRWANA-AI dan digunakan untuk keperluan pengujian laboratorium. Data belum digunakan sebagai dasar diagnosis klinis.
```

---

# 6. Revisi Kebutuhan Fungsional

| Kode   | Kebutuhan                                                                                |
| ------ | ---------------------------------------------------------------------------------------- |
| FR-001 | Dashboard dapat terhubung ke MQTT broker melalui WebSocket.                              |
| FR-002 | Dashboard dapat subscribe ke topic telemetry.                                            |
| FR-003 | Dashboard dapat membaca payload JSON dari ESP32.                                         |
| FR-004 | Dashboard dapat menampilkan nilai rSO₂ terbaru.                                          |
| FR-005 | Dashboard dapat menampilkan RED raw dan IR raw.                                          |
| FR-006 | Dashboard dapat menampilkan motion status.                                               |
| FR-007 | Dashboard dapat menampilkan SQI.                                                         |
| FR-008 | Dashboard dapat menampilkan battery percentage.                                          |
| FR-009 | Dashboard dapat menampilkan alert status.                                                |
| FR-010 | Dashboard dapat memperbarui grafik secara realtime.                                      |
| FR-011 | Dashboard dapat menyimpan 20 data terakhir ke localStorage.                              |
| FR-012 | Dashboard dapat menampilkan riwayat data dalam tabel desktop.                            |
| FR-013 | Dashboard dapat menampilkan riwayat data dalam kartu mobile.                             |
| FR-014 | Dashboard dapat menampilkan status koneksi MQTT.                                         |
| FR-015 | Dashboard tetap dapat dibuka meskipun belum ada data MQTT.                               |
| FR-016 | Dashboard menyediakan tombol Export PDF pada modul Riwayat Data.                         |
| FR-017 | Dashboard dapat membuat file PDF dari data riwayat monitoring.                           |
| FR-018 | PDF berisi informasi perangkat, waktu export, status terakhir, dan tabel riwayat data.   |
| FR-019 | PDF dapat diunduh langsung oleh pengguna dari browser.                                   |
| FR-020 | Dashboard menampilkan pesan apabila Export PDF dilakukan saat data riwayat masih kosong. |

---

# 7. Revisi Kebutuhan Non-Fungsional

| Kode    | Kebutuhan                                                                      |
| ------- | ------------------------------------------------------------------------------ |
| NFR-001 | Dashboard harus responsif pada desktop dan mobile.                             |
| NFR-002 | Tampilan harus rapi dan layak untuk presentasi PKM.                            |
| NFR-003 | Dashboard harus dapat berjalan lokal di localhost.                             |
| NFR-004 | Dashboard harus dapat menerima data MQTT minimal setiap 1 detik.               |
| NFR-005 | Dashboard harus ringan dan tidak membebani laptop.                             |
| NFR-006 | Koneksi MQTT harus otomatis mencoba reconnect apabila terputus.                |
| NFR-007 | Riwayat data awal harus tetap tersimpan ketika halaman di-refresh.             |
| NFR-008 | Dashboard tidak boleh menampilkan error besar ketika payload MQTT tidak valid. |
| NFR-009 | UI harus memiliki kontras warna yang jelas.                                    |
| NFR-010 | Dashboard harus mudah dikembangkan ke database permanen di tahap berikutnya.   |
| NFR-011 | File PDF harus memiliki format yang rapi dan mudah dibaca.                     |
| NFR-012 | Proses Export PDF tidak boleh mengganggu koneksi MQTT realtime.                |
| NFR-013 | File PDF harus dapat dibuka di perangkat desktop dan mobile.                   |

---

# 8. Revisi Data History

Pada MVP awal, data history disimpan di *localStorage* browser. Pada tahap lanjutan, data dapat dipindahkan ke SQLite.

Aturan penyimpanan:

1. Data terbaru disimpan di posisi paling atas.
2. Maksimal data awal yang disimpan adalah 20 data terakhir.
3. Data lama akan dihapus otomatis ketika melebihi batas.
4. History tetap muncul saat browser di-refresh.
5. Data history dapat diekspor menjadi PDF.
6. Tombol Clear History dapat ditambahkan untuk menghapus seluruh data riwayat.
7. Pada tahap lanjutan, SQLite digunakan untuk menyimpan data lebih banyak dan lebih permanen.

---

# 9. Revisi Komponen Riwayat Data

Komponen Riwayat Data terdiri dari:

1. Judul card: Riwayat Data.
2. Tombol Export PDF.
3. Tombol Clear History.
4. Tabel data untuk desktop.
5. Kartu data untuk mobile.
6. Pesan kosong apabila belum ada data.

Layout desktop:

```text
Riwayat Data                          [Export PDF] [Clear History]

| Waktu | rSO₂ | RED | IR | Ratio | Motion | SQI | Battery | Status |
```

Layout mobile:

```text
Riwayat Data
[Export PDF]
[Clear History]

Card Data 1
- Waktu
- rSO₂
- RED
- IR
- Ratio
- Motion
- SQI
- Battery
- Status
```

---

# 10. Revisi Kriteria Keberhasilan MVP

Dashboard dianggap berhasil apabila:

1. Dashboard dapat berjalan lokal di `localhost:3000`.
2. Mosquitto broker dapat berjalan dengan port 1883 dan 9001.
3. ESP32 dapat publish data ke topic MQTT.
4. Dashboard dapat menerima data MQTT melalui WebSocket.
5. Nilai rSO₂ tampil secara realtime.
6. Grafik rSO₂ bergerak mengikuti data masuk.
7. Grafik RED dan IR bergerak mengikuti data masuk.
8. Status NORMAL, WASPADA, dan HIPOKSIA dapat berubah sesuai data.
9. Riwayat data muncul di tabel desktop.
10. Riwayat data muncul sebagai kartu pada mobile.
11. Dashboard tetap rapi saat dibuka di layar laptop dan HP.
12. Data tidak hilang ketika halaman di-refresh karena tersimpan di localStorage.
13. Pengguna dapat menekan tombol Export PDF.
14. Sistem berhasil membuat file PDF dari data riwayat.
15. PDF berisi tabel riwayat monitoring.
16. PDF memiliki catatan bahwa data berasal dari prototipe dan belum digunakan untuk diagnosis klinis.

---

# 11. Revisi Timeline Implementasi Awal

| Minggu   | Target                                                        |
| -------- | ------------------------------------------------------------- |
| Minggu 1 | Setup project Next.js dan membuat UI dashboard dummy          |
| Minggu 2 | Setup Mosquitto dan integrasi MQTT.js                         |
| Minggu 3 | Integrasi ESP32 publish data dummy                            |
| Minggu 4 | Integrasi sensor, penyempurnaan tampilan demo, dan Export PDF |

---

# 12. Revisi Risiko dan Mitigasi

| Risiko                               | Dampak                   | Mitigasi                                                        |
| ------------------------------------ | ------------------------ | --------------------------------------------------------------- |
| Data history kosong saat Export PDF  | PDF tidak memiliki isi   | Tampilkan pesan “Data riwayat masih kosong”                     |
| Format tabel PDF terlalu lebar       | PDF sulit dibaca         | Gunakan orientasi landscape                                     |
| Data terlalu banyak                  | PDF terlalu panjang      | Batasi data awal 20–50 data terakhir                            |
| Browser memblokir download           | File PDF gagal tersimpan | Gunakan proses download standar dari jsPDF                      |
| Nilai data tidak lengkap             | Tabel PDF tidak rapi     | Beri nilai default seperti “-” pada field kosong                |
| Export PDF mengganggu realtime chart | Dashboard terasa berat   | Jalankan export hanya saat tombol ditekan                       |
| PDF dianggap data klinis             | Salah interpretasi       | Tambahkan catatan bahwa data hanya untuk prototipe laboratorium |

---

# 13. Definisi Selesai untuk Fitur Export PDF

Fitur Export PDF dinyatakan selesai apabila:

1. Tombol Export PDF muncul pada modul Riwayat Data.
2. Tombol tidak error saat diklik.
3. Sistem dapat membaca data history dari localStorage.
4. Sistem dapat membuat file PDF.
5. PDF otomatis terunduh.
6. PDF berisi informasi perangkat.
7. PDF berisi tabel riwayat data.
8. PDF berisi waktu export.
9. PDF berisi status terakhir.
10. PDF memiliki catatan prototipe non-klinis.
11. Tampilan dashboard tetap responsif setelah fitur ditambahkan.
