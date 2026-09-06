"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CircleSlash, Database, Radio, Timer } from "lucide-react";
import { DEFAULT_TELEMETRY_API } from "@/lib/telemetry";
import { statusMeta } from "@/lib/format";
import { Reveal } from "@/components/landing/Reveal";

const TELEMETRY_API = (process.env.NEXT_PUBLIC_TELEMETRY_API || DEFAULT_TELEMETRY_API).replace(/\/+$/, "");

// Pita normal perangkat; sama dengan yang dipakai aplikasi pendamping orang tua.
const NORMAL_LOW = 65;
const NORMAL_HIGH = 85;

// Kurva contoh untuk menjelaskan cara membaca grafik. Ditandai eksplisit sebagai
// ilustrasi supaya tidak tertukar dengan pembacaan pasien.
const illustrativeCurve = Array.from({ length: 48 }, (_, index) => {
  const drift = index < 22 ? 76 : 76 - (index - 22) * 1.55;
  const ripple = Math.sin(index * 0.7) * 1.6 + Math.cos(index * 0.31) * 1.1;
  return { menit: index, rso2: Number(Math.max(38, drift + ripple).toFixed(1)) };
});

function StatTile({ icon: Icon, label, value, hint, tone = "text-nirwana-accent" }) {
  return (
    <div className="rounded-card border border-nirwana-border bg-nirwana-surface p-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className={tone} />
        <p className="text-xs font-medium text-nirwana-muted">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-nirwana-text">{value}</p>
      <p className="mt-0.5 text-[11px] text-nirwana-muted">{hint}</p>
    </div>
  );
}

export function LandingCharts() {
  const [history, setHistory] = useState(null);
  const [reachable, setReachable] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const response = await fetch(`${TELEMETRY_API}/api/telemetry/history`, { cache: "no-store" });
        if (!response.ok) throw new Error("backend tidak siap");

        const payload = await response.json();
        if (cancelled) return;

        setHistory(Array.isArray(payload) ? payload : []);
        setReachable(true);
      } catch {
        if (!cancelled) {
          setHistory([]);
          setReachable(false);
        }
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const items = history || [];
    const counts = { NORMAL: 0, WASPADA: 0, HIPOKSIA: 0 };

    for (const item of items) {
      if (counts[item.alertStatus] !== undefined) {
        counts[item.alertStatus] += 1;
      }
    }

    const timestamps = items
      .map((item) => new Date(item.timestamp).getTime())
      .filter((value) => Number.isFinite(value));
    const spanMs = timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
    const minutes = Math.round(spanMs / 60000);

    return {
      total: items.length,
      durasi: minutes >= 60 ? `${Math.floor(minutes / 60)} j ${minutes % 60} m` : `${minutes} menit`,
      bars: [
        { status: "NORMAL", nama: statusMeta.NORMAL.label, jumlah: counts.NORMAL, warna: statusMeta.NORMAL.chart },
        { status: "WASPADA", nama: statusMeta.WASPADA.label, jumlah: counts.WASPADA, warna: statusMeta.WASPADA.chart },
        { status: "HIPOKSIA", nama: statusMeta.HIPOKSIA.label, jumlah: counts.HIPOKSIA, warna: statusMeta.HIPOKSIA.chart },
      ],
    };
  }, [history]);

  const loading = reachable === null;

  return (
    <section id="data" className="scroll-mt-20 bg-nirwana-background">
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 lg:py-18">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-nirwana-accent">Ringkasan sistem</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-nirwana-text sm:text-[1.75rem]">
            Cara membaca angka dan kondisi perangkat
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-nirwana-muted">
            Halaman publik ini hanya menampilkan hitungan agregat perangkat tanpa identitas pasien dan tanpa nilai per
            waktu. Grafik pasien lengkap berada di balik login.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={Radio}
            label="Status perangkat"
            value={loading ? "…" : reachable ? "Terhubung" : "Nonaktif"}
            hint={reachable ? "Backend telemetri merespons" : "Backend telemetri belum berjalan"}
            tone={reachable ? "text-nirwana-normal" : "text-nirwana-muted"}
          />
          <StatTile
            icon={Database}
            label="Pembacaan tersimpan"
            value={loading ? "…" : summary.total.toLocaleString("id-ID")}
            hint="Cache riwayat sesi berjalan"
          />
          <StatTile
            icon={Timer}
            label="Rentang sesi"
            value={loading ? "…" : summary.total ? summary.durasi : "-"}
            hint="Selisih pembacaan terlama dan terbaru"
          />
          <StatTile
            icon={Activity}
            label="Pita normal rSO₂"
            value={`${NORMAL_LOW}–${NORMAL_HIGH}%`}
            hint="Ambang kerja perangkat NIRWANA-AI"
          />
        </Reveal>

        <Reveal delay={140} className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-card border border-nirwana-border bg-nirwana-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-nirwana-text">Pola penurunan rSO₂</h3>
              <span className="rounded-full border border-nirwana-border bg-nirwana-surfaceMuted px-2.5 py-0.5 text-[11px] font-semibold text-nirwana-muted">
                Ilustrasi — bukan data pasien
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-nirwana-muted">
              Area hijau menandai pita normal {NORMAL_LOW}–{NORMAL_HIGH}%. Kurva contoh memperlihatkan bentuk penurunan
              bertahap yang menjadi alasan pemantauan kontinu: garis menembus batas bawah jauh sebelum tanda klinis
              biasanya terlihat.
            </p>

            <div className="mt-4 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={illustrativeCurve} margin={{ top: 6, right: 8, bottom: 4, left: -18 }}>
                  <defs>
                    <linearGradient id="landing-rso2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e4e7eb" strokeDasharray="3 3" vertical={false} />
                  <ReferenceArea y1={NORMAL_LOW} y2={NORMAL_HIGH} fill="#16a34a" fillOpacity={0.09} />
                  <XAxis
                    dataKey="menit"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#e4e7eb" }}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <YAxis
                    domain={[30, 100]}
                    ticks={[30, 40, 50, 60, 70, 80, 90, 100]}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e4e7eb",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value}%`, "rSO₂"]}
                    labelFormatter={(label) => `Menit ke-${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="rso2"
                    stroke="#0f766e"
                    strokeWidth={2.4}
                    fill="url(#landing-rso2)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-card border border-nirwana-border bg-nirwana-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-nirwana-text">Distribusi status sesi</h3>
              <span className="rounded-full border border-nirwana-accent/20 bg-nirwana-accentSoft/50 px-2.5 py-0.5 text-[11px] font-semibold text-nirwana-accent">
                Data agregat
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-nirwana-muted">
              Jumlah pembacaan per kategori status pada sesi monitoring yang sedang berjalan.
            </p>

            {loading ? (
              <div className="mt-6 h-[220px] animate-pulse rounded-lg bg-nirwana-surfaceMuted" />
            ) : summary.total ? (
              <div className="mt-4 h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.bars} margin={{ top: 6, right: 8, bottom: 4, left: -18 }}>
                    <CartesianGrid stroke="#e4e7eb" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="nama"
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e4e7eb" }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f1f3f4" }}
                      contentStyle={{ borderRadius: 10, border: "1px solid #e4e7eb", fontSize: 12 }}
                      formatter={(value) => [`${value} pembacaan`, "Jumlah"]}
                    />
                    <Bar dataKey="jumlah" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {summary.bars.map((bar) => (
                        <Cell key={bar.status} fill={bar.warna} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 grid h-[220px] place-items-center rounded-lg border border-dashed border-nirwana-border text-center">
                <div className="px-6">
                  <CircleSlash size={22} className="mx-auto text-nirwana-muted" />
                  <p className="mt-2.5 text-sm font-medium text-nirwana-text">Belum ada data sesi</p>
                  <p className="mt-1 text-xs leading-relaxed text-nirwana-muted">
                    {reachable
                      ? "Backend berjalan, tetapi cache riwayat masih kosong."
                      : "Jalankan backend telemetri untuk menampilkan ringkasan."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
