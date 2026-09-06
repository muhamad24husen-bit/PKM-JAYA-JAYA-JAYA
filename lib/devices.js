import { DEFAULT_DEVICE_ID } from "@/lib/telemetry";
import { profile } from "@/lib/profile";

// Registry sementara untuk membangun tampilan multi-sensor sebelum backend
// mendukungnya. Hanya DEFAULT_DEVICE_ID yang benar-benar mengirim data; sisanya
// ditandai placeholder agar tidak tertukar dengan pasien nyata.
//
// Ketika backend sudah menyimpan telemetri per-deviceId, ganti isi berkas ini
// dengan pembacaan GET /api/devices dan hapus seluruh entri placeholder.
export const devices = [
  {
    id: DEFAULT_DEVICE_ID,
    bed: "NICU-01",
    patientName: profile.patientName,
    patientCode: profile.patientCode,
    clinician: `${profile.clinicianName} ${profile.clinicianTitle}`,
    placeholder: false,
  },
  {
    id: "nirwana_002",
    bed: "NICU-02",
    patientName: "Bed kosong",
    patientCode: "-",
    clinician: "-",
    placeholder: true,
  },
  {
    id: "nirwana_003",
    bed: "NICU-03",
    patientName: "Bed kosong",
    patientCode: "-",
    clinician: "-",
    placeholder: true,
  },
  {
    id: "nirwana_004",
    bed: "NICU-04",
    patientName: "Bed kosong",
    patientCode: "-",
    clinician: "-",
    placeholder: true,
  },
];

export function findDevice(deviceId) {
  return devices.find((device) => device.id === deviceId) || null;
}

// Urutan triase: Darurat lebih dulu, lalu Waspada, lalu sisanya. Perangkat tanpa
// data turun ke bawah supaya bed aktif selalu berada di baris atas.
const severityRank = { HIPOKSIA: 0, WASPADA: 1, NORMAL: 2 };

export function bySeverity(a, b) {
  const rankA = a.latest ? severityRank[a.latest.alertStatus] ?? 3 : 4;
  const rankB = b.latest ? severityRank[b.latest.alertStatus] ?? 3 : 4;

  if (rankA !== rankB) return rankA - rankB;
  return a.bed.localeCompare(b.bed);
}
