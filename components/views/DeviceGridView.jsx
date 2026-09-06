"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BatteryMedium, ChevronRight, LogOut, PlugZap, Radio, WifiOff } from "lucide-react";
import { DEFAULT_TELEMETRY_API, HISTORY_LIMIT, toDisplayValue } from "@/lib/telemetry";
import { formatRso2, shortDateTime, signalLabel, statusOf } from "@/lib/format";
import { bySeverity, devices } from "@/lib/devices";
import { Logo } from "@/components/ui/Logo";
import { StatusBadge } from "@/components/ui/StatusBadge";

const TELEMETRY_API = (process.env.NEXT_PUBLIC_TELEMETRY_API || DEFAULT_TELEMETRY_API).replace(/\/+$/, "");
const SPARK_POINTS = 40;

function buildApiUrl(path) {
  return new URL(path, TELEMETRY_API).toString();
}

// Sparkline ringkas; cukup untuk melihat arah tren tanpa memuat Recharts di
// setiap kartu grid.
function Sparkline({ points, color }) {
  if (points.length < 2) {
    return <div className="h-10 rounded bg-nirwana-surfaceMuted" />;
  }

  const values = points.map((point) => point.rso2).filter(Number.isFinite);
  if (values.length < 2) {
    return <div className="h-10 rounded bg-nirwana-surfaceMuted" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${(index * step).toFixed(2)} ${(34 - ((value - min) / span) * 28).toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceCard({ device }) {
  const { latest, series, placeholder } = device;
  const meta = statusOf(latest?.alertStatus);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-semibold text-nirwana-text">{device.bed}</p>
          <p className="mt-0.5 text-xs text-nirwana-muted">
            {device.patientName}
            {device.patientCode !== "-" ? ` · ${device.patientCode}` : ""}
          </p>
        </div>
        {latest ? <StatusBadge status={latest.alertStatus} /> : null}
      </div>

      {latest ? (
        <>
          <div className="mt-4 flex items-end gap-2">
            <span className={`font-display text-4xl font-semibold leading-none ${meta.tone}`}>
              {formatRso2(latest.rso2)}
            </span>
            <span className="pb-1 text-sm text-nirwana-muted">% rSO₂</span>
          </div>

          <div className="mt-3">
            <Sparkline points={series} color={meta.chart} />
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-nirwana-border pt-3 text-[11px]">
            <div>
              <dt className="text-nirwana-muted">Sinyal</dt>
              <dd className="mt-0.5 font-medium text-nirwana-text">{signalLabel(latest.sqi)}</dd>
            </div>
            <div>
              <dt className="text-nirwana-muted">Baterai</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-nirwana-text">
                <BatteryMedium size={12} />
                {toDisplayValue(latest.battery, "%")}
              </dd>
            </div>
            <div>
              <dt className="text-nirwana-muted">Update</dt>
              <dd className="mt-0.5 font-medium text-nirwana-text">{shortDateTime(latest.timestamp).split(" ").pop()}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="mt-4 grid h-[150px] place-items-center rounded-lg border border-dashed border-nirwana-border text-center">
          <div className="px-4">
            <WifiOff size={20} className="mx-auto text-nirwana-muted" />
            <p className="mt-2 text-xs font-medium text-nirwana-text">
              {placeholder ? "Sensor belum terpasang" : "Belum ada data"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-nirwana-muted">
              {placeholder ? "Slot contoh untuk pratinjau tata letak" : "Menunggu telemetri dari perangkat"}
            </p>
          </div>
        </div>
      )}
    </>
  );

  const shell = `rounded-card border bg-nirwana-surface p-5 transition ${
    latest ? `${meta.border} hover:border-nirwana-accent/50 hover:shadow-sm` : "border-nirwana-border"
  }`;

  if (placeholder) {
    return <div className={`${shell} opacity-70`}>{body}</div>;
  }

  return (
    <Link href={`/dashboard/${device.id}`} className={`block ${shell}`}>
      {body}
      <p className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-nirwana-accent">
        Buka detail
        <ChevronRight size={14} />
      </p>
    </Link>
  );
}

export function DeviceGridView() {
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch(buildApiUrl("/api/telemetry/history"), { cache: "no-store" });
        if (!response.ok) throw new Error("backend belum siap");

        const payload = await response.json();
        if (cancelled) return;

        setHistory(Array.isArray(payload) ? payload.slice(0, HISTORY_LIMIT) : []);
        setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    }

    loadHistory();

    // Backend belum punya stream per-perangkat, jadi grid disegarkan berkala.
    // Ganti dengan SSE bertanda deviceId begitu backend mendukungnya.
    const timerId = window.setInterval(loadHistory, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, []);

  const cards = useMemo(() => {
    return devices
      .map((device) => {
        const items = device.placeholder ? [] : history.filter((item) => item.deviceId === device.id);

        return {
          ...device,
          latest: items[0] || null,
          series: items.slice(0, SPARK_POINTS).reverse(),
        };
      })
      .sort(bySeverity);
  }, [history]);

  const kritis = cards.filter((card) => card.latest?.alertStatus === "HIPOKSIA").length;
  const aktif = cards.filter((card) => card.latest).length;

  async function keluar() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie tetap dibuang middleware pada permintaan berikutnya.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-nirwana-background text-nirwana-text">
      <header className="border-b border-nirwana-border bg-nirwana-surface">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div className="leading-tight">
              <h1 className="font-display text-base font-semibold text-nirwana-text">Sensor Terpasang</h1>
              <p className="text-xs text-nirwana-muted">Pilih bed untuk membuka pemantauan detail</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                online
                  ? "border-nirwana-normal/25 bg-nirwana-normalSoft text-nirwana-normal"
                  : "border-nirwana-border bg-nirwana-surfaceMuted text-nirwana-muted"
              }`}
            >
              {online ? <Radio size={13} /> : <PlugZap size={13} />}
              {online === null ? "Menghubungkan…" : online ? "Terhubung" : "nonaktif"}
            </span>

            <button
              type="button"
              onClick={keluar}
              className="flex items-center gap-1.5 rounded-lg border border-nirwana-border px-3 py-1.5 text-xs font-semibold text-nirwana-muted transition hover:border-nirwana-hipoksia/40 hover:text-nirwana-hipoksia"
            >
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap gap-3">
          <span className="rounded-lg border border-nirwana-border bg-nirwana-surface px-3.5 py-2 text-xs text-nirwana-muted">
            Bed aktif: <strong className="font-semibold text-nirwana-text">{aktif}</strong> dari {devices.length}
          </span>
          <span
            className={`rounded-lg border px-3.5 py-2 text-xs ${
              kritis
                ? "border-nirwana-hipoksia/30 bg-nirwana-hipoksiaSoft text-nirwana-hipoksia"
                : "border-nirwana-border bg-nirwana-surface text-nirwana-muted"
            }`}
          >
            Status Darurat: <strong className="font-semibold">{kritis}</strong>
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <DeviceCard key={card.id} device={card} />
          ))}
        </div>

        </div>
    </main>
  );
}
