// Identitas pasien dan klinisi. Diisi dari environment variable (NEXT_PUBLIC_*)
// agar dashboard bisa dipakai untuk subjek berbeda tanpa mengubah kode.
// Setiap process.env.NEXT_PUBLIC_* harus direferensikan statis agar di-inline Next.js.
export const profile = {
  patientName: process.env.NEXT_PUBLIC_PATIENT_NAME || "Brian cheko",
  patientCode: process.env.NEXT_PUBLIC_PATIENT_CODE || "Neo-0824-A",
  patientSubject: process.env.NEXT_PUBLIC_PATIENT_SUBJECT || "Neonatus-01",
  monitorId: process.env.NEXT_PUBLIC_MONITOR_ID || "NW-2024-001",
  clinicianName: process.env.NEXT_PUBLIC_CLINICIAN_NAME || "Dr. Arisandi",
  clinicianTitle: process.env.NEXT_PUBLIC_CLINICIAN_TITLE || "Sp.A(K)",
};
