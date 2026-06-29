import { Activity, CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";
import { statusOf } from "@/lib/format";
import { formatDateTime, toDisplayValue } from "@/lib/telemetry";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AlertView({ history, current }) {
  const alerts = history.filter((item) => item.alertStatus && item.alertStatus !== "NORMAL");
  const hipoksiaCount = history.filter((item) => item.alertStatus === "HIPOKSIA").length;
  const waspadaCount = history.filter((item) => item.alertStatus === "WASPADA").length;
  const normalCount = history.filter((item) => item.alertStatus === "NORMAL").length;
  const meta = statusOf(current.alertStatus);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Status Saat Ini"
          value={meta.header}
          icon={ShieldAlert}
          tone={meta.tone}
          danger
          pulse={current.alertStatus !== "NORMAL"}
        />
        <SummaryCard title="Total Hipoksia" value={String(hipoksiaCount)} icon={Activity} tone="text-[#ffb4ab]" />
        <SummaryCard title="Total Waspada" value={String(waspadaCount)} icon={TriangleAlert} tone="text-yellow-400" />
        <SummaryCard title="Total Normal" value={String(normalCount)} icon={CheckCircle2} tone="text-emerald-400" />
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#161b26]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">Riwayat Peringatan</p>
          <h2 className="font-display text-lg font-semibold text-[#dce4e4]">Daftar Alert</h2>
        </div>
        <div className="p-5">
          {alerts.length ? (
            <ul className="space-y-3">
              {alerts.map((item) => {
                const itemMeta = statusOf(item.alertStatus);
                const critical = item.alertStatus === "HIPOKSIA";

                return (
                  <li
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${itemMeta.border} ${itemMeta.bg}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`grid h-9 w-9 place-items-center rounded-full ${critical ? "bg-[#ffb4ab]/15 text-[#ffb4ab]" : "bg-yellow-400/15 text-yellow-400"}`}>
                        {critical ? <Activity size={18} /> : <TriangleAlert size={18} />}
                      </div>
                      <div>
                        <p className={`font-display text-sm font-bold ${itemMeta.tone}`}>{itemMeta.header}</p>
                        <p className="text-xs text-[#849495]">{formatDateTime(item.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-[#849495]">rSO2</p>
                        <p className="font-mono text-[#dce4e4]">{toDisplayValue(item.rso2, "%")}</p>
                      </div>
                      <StatusBadge status={item.alertStatus} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 py-10 text-center text-sm text-[#b9cacb]">
              Tidak ada peringatan. Semua pembacaan dalam kondisi normal.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
