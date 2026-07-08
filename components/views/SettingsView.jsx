import { DEFAULT_DEVICE_ID, HISTORY_LIMIT } from "@/lib/telemetry";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";

export function SettingsView({ topic, telemetryApiUrl }) {
  const configRows = [
    ["Topic MQTT", topic],
    ["Backend Telemetry", telemetryApiUrl],
    ["Batas Riwayat", `${HISTORY_LIMIT} data`],
    ["Device ID Default", DEFAULT_DEVICE_ID],
  ];
  const profileRows = [
    ["Pasien", `${profile.patientName} (${profile.patientCode})`],
    ["Subjek", profile.patientSubject],
    ["ID Monitor", profile.monitorId],
    ["Klinisi", `${profile.clinicianName} ${profile.clinicianTitle}`],
  ];

  return (
    <section className="space-y-6">
      <Card title="Konfigurasi Sistem">
        <dl className="space-y-3">
          {configRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-nirwana-surfaceMuted px-4 py-3">
              <dt className="text-sm text-nirwana-muted">{label}</dt>
              <dd className="break-all font-mono text-sm text-nirwana-text">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-nirwana-muted">
          Konfigurasi diambil dari environment variable. Ubah melalui file .env lalu mulai ulang aplikasi.
        </p>
      </Card>

      <Card title="Profil Pasien & Klinisi">
        <dl className="space-y-3">
          {profileRows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded bg-nirwana-surfaceMuted px-4 py-3">
              <dt className="text-sm text-nirwana-muted">{label}</dt>
              <dd className="break-all font-mono text-sm text-nirwana-text">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-nirwana-muted">
          Atur melalui variabel NEXT_PUBLIC_PATIENT_NAME, NEXT_PUBLIC_CLINICIAN_NAME, dll di file .env.
        </p>
      </Card>
    </section>
  );
}
