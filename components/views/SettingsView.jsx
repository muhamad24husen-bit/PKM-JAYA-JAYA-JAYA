import { useState } from "react";
import { DEFAULT_DEVICE_ID, HISTORY_LIMIT } from "@/lib/telemetry";
import { shortDateTime } from "@/lib/format";
import { profile } from "@/lib/profile";
import { Card } from "@/components/ui/Card";

function SimulationCard({ simulation, onSimulateStart, onSimulateStop }) {
  const [backfillPilihan, setBackfillPilihan] = useState("2");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const berjalan = Boolean(simulation?.running);

  async function mulai() {
    setSibuk(true);
    setPesan(await onSimulateStart(Number(backfillPilihan)));
    setSibuk(false);
  }

  async function henti() {
    setSibuk(true);
    setPesan(await onSimulateStop());
    setSibuk(false);
  }

  return (
    <Card title="Simulasi Data">
      <p className="text-sm">
        <span className="text-nirwana-muted">Status: </span>
        {berjalan ? (
          <span className="font-semibold text-nirwana-waspada">
            Aktif &mdash; fase {simulation.phase === "backfill" ? "backfill" : "live"} &middot; {simulation.sent} pesan &middot; sejak {shortDateTime(simulation.startedAt)}
          </span>
        ) : (
          <span className="font-semibold text-nirwana-text">Nonaktif</span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-nirwana-muted">
          Isi riwayat dulu:
          <select
            value={backfillPilihan}
            onChange={(event) => setBackfillPilihan(event.target.value)}
            disabled={berjalan || sibuk}
            className="rounded-lg border border-nirwana-border bg-white px-2.5 py-1.5 text-xs font-semibold text-nirwana-text focus:outline-none focus:ring-2 focus:ring-nirwana-accent/40 disabled:opacity-50"
          >
            <option value="0">Tanpa</option>
            <option value="2">2 jam</option>
            <option value="26">26 jam</option>
          </select>
        </label>

        {berjalan ? (
          <button
            type="button"
            onClick={henti}
            disabled={sibuk}
            className="rounded-lg border border-nirwana-hipoksia/40 px-4 py-2 text-sm font-semibold text-nirwana-hipoksia transition hover:bg-nirwana-hipoksiaSoft disabled:opacity-50"
          >
            Hentikan Simulasi
          </button>
        ) : (
          <button
            type="button"
            onClick={mulai}
            disabled={sibuk}
            className="rounded-lg bg-nirwana-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Mulai Simulasi
          </button>
        )}
      </div>

      {pesan ? <p className="mt-3 text-xs font-semibold text-nirwana-hipoksia">{pesan}</p> : null}

      <p className="mt-4 text-xs text-nirwana-muted">
        Data simulasi bersifat sintetis untuk pengujian &mdash; bukan pembacaan sensor. Kosongkan lewat Riwayat Data &rarr; Clear History.
      </p>
    </Card>
  );
}

export function SettingsView({ topic, telemetryApiUrl, simulation = null, onSimulateStart, onSimulateStop }) {
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

      <SimulationCard simulation={simulation} onSimulateStart={onSimulateStart} onSimulateStop={onSimulateStop} />
    </section>
  );
}
