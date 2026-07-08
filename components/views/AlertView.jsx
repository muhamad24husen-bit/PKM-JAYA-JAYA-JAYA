import { Activity, CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";
import { statusOf } from "@/lib/format";
import { formatDateTime, toDisplayValue } from "@/lib/telemetry";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

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
        <SummaryCard title="Total Hipoksia" value={String(hipoksiaCount)} icon={Activity} tone="text-nirwana-hipoksia" />
        <SummaryCard title="Total Waspada" value={String(waspadaCount)} icon={TriangleAlert} tone="text-nirwana-waspada" />
        <SummaryCard title="Total Normal" value={String(normalCount)} icon={CheckCircle2} tone="text-nirwana-normal" />
      </div>

      <Card title="Riwayat Peringatan">
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
                    <div className={`grid h-9 w-9 place-items-center rounded-full bg-nirwana-surface ${itemMeta.tone}`}>
                      {critical ? <Activity size={18} /> : <TriangleAlert size={18} />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${itemMeta.tone}`}>{itemMeta.header}</p>
                      <p className="text-xs text-nirwana-muted">{formatDateTime(item.timestamp)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-nirwana-muted">rSO2</p>
                      <p className="font-mono text-nirwana-text">{toDisplayValue(item.rso2, "%")}</p>
                    </div>
                    <StatusBadge status={item.alertStatus} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-nirwana-border py-10 text-center text-sm text-nirwana-muted">
            Tidak ada peringatan. Semua pembacaan dalam kondisi normal.
          </div>
        )}
      </Card>
    </section>
  );
}
