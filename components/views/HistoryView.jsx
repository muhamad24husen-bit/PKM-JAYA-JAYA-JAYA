import { Download, Trash2 } from "lucide-react";
import { DEFAULT_DEVICE_ID, formatDateTime, toDisplayValue } from "@/lib/telemetry";
import { StatusBadge } from "@/components/ui/StatusBadge";

function HistoryTable({ history }) {
  return (
    <div data-testid="history-table" className="hidden overflow-x-auto scrollbar-thin md:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-[#b9cacb]">
          <tr>
            {["Waktu", "rSO2", "RED", "IR", "Ratio", "Motion", "SQI", "Battery", "Status"].map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((item) => (
            <tr key={item.id} className="border-b border-white/5">
              <td className="px-4 py-3 text-[#b9cacb]">{formatDateTime(item.timestamp)}</td>
              <td className="px-4 py-3 font-mono text-white">{toDisplayValue(item.rso2, "%")}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.red)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.ir)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.ratio)}</td>
              <td className="px-4 py-3">{toDisplayValue(item.motion)}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.sqi, "%")}</td>
              <td className="px-4 py-3 font-mono">{toDisplayValue(item.battery, "%")}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.alertStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryCards({ history }) {
  return (
    <div data-testid="history-cards" className="space-y-3 md:hidden">
      {history.map((item) => (
        <article key={item.id} className="rounded-lg border border-white/10 bg-[#192122]/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{formatDateTime(item.timestamp)}</p>
              <p className="mt-1 text-xs text-[#b9cacb]">{item.deviceId || DEFAULT_DEVICE_ID}</p>
            </div>
            <StatusBadge status={item.alertStatus} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["rSO2", toDisplayValue(item.rso2, "%")],
              ["RED", toDisplayValue(item.red)],
              ["IR", toDisplayValue(item.ir)],
              ["Ratio", toDisplayValue(item.ratio)],
              ["Motion", toDisplayValue(item.motion)],
              ["SQI", toDisplayValue(item.sqi, "%")],
              ["Battery", toDisplayValue(item.battery, "%")],
            ].map(([label, value]) => (
              <div key={label} className="rounded bg-black/15 p-3">
                <dt className="text-xs text-[#b9cacb]">{label}</dt>
                <dd className="mt-1 font-mono text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export function HistoryPanel({ history, onExport, onClear, message }) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-[#161b26]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">Database</p>
          <h2 className="font-display text-lg font-semibold text-[#dce4e4]">Riwayat Data</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="export-pdf"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded bg-[#00f2ff] px-4 py-2 text-sm font-semibold text-[#002022] transition hover:shadow-[0_0_15px_rgba(0,242,255,0.25)]"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            type="button"
            data-testid="clear-history"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-sm font-semibold text-[#b9cacb] transition hover:border-[#ffb4ab]/40 hover:text-[#ffb4ab]"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        </div>
      </div>

      {message ? (
        <p className="mx-5 mt-4 rounded border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-100">
          {message}
        </p>
      ) : null}

      <div className="p-5">
        {history.length ? (
          <>
            <HistoryTable history={history} />
            <HistoryCards history={history} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 py-10 text-center text-sm text-[#b9cacb]">
            Belum ada data riwayat monitoring.
          </div>
        )}
      </div>
    </section>
  );
}
