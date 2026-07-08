import { Download, Trash2 } from "lucide-react";
import { DEFAULT_DEVICE_ID, formatDateTime, toDisplayValue } from "@/lib/telemetry";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

function HistoryTable({ history }) {
  return (
    <div data-testid="history-table" className="hidden overflow-x-auto scrollbar-thin md:block">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-nirwana-border text-xs uppercase tracking-wide text-nirwana-muted">
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
            <tr key={item.id} className="border-b border-nirwana-border">
              <td className="px-4 py-3 text-nirwana-muted">{formatDateTime(item.timestamp)}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.rso2, "%")}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.red)}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.ir)}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.ratio)}</td>
              <td className="px-4 py-3 text-nirwana-text">{toDisplayValue(item.motion)}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.sqi, "%")}</td>
              <td className="px-4 py-3 font-mono text-nirwana-text">{toDisplayValue(item.battery, "%")}</td>
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
        <article key={item.id} className="rounded-lg border border-nirwana-border bg-nirwana-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-nirwana-text">{formatDateTime(item.timestamp)}</p>
              <p className="mt-1 text-xs text-nirwana-muted">{item.deviceId || DEFAULT_DEVICE_ID}</p>
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
              <div key={label} className="rounded bg-nirwana-surfaceMuted p-3">
                <dt className="text-xs text-nirwana-muted">{label}</dt>
                <dd className="mt-1 font-mono text-nirwana-text">{value}</dd>
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
    <Card className="!p-0">
      <div className="flex flex-col gap-4 border-b border-nirwana-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">Database</p>
          <h2 className="text-lg font-semibold text-nirwana-text">Riwayat Data</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="export-pdf"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded bg-nirwana-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-nirwana-accent/90"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            type="button"
            data-testid="clear-history"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded border border-nirwana-border px-4 py-2 text-sm font-semibold text-nirwana-muted transition hover:border-nirwana-hipoksia/40 hover:text-nirwana-hipoksia"
          >
            <Trash2 size={16} />
            Clear History
          </button>
        </div>
      </div>

      {message ? (
        <p className="mx-5 mt-4 rounded border border-nirwana-waspada/25 bg-nirwana-waspadaSoft px-3 py-2 text-sm text-nirwana-waspada">
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
          <div className="rounded-lg border border-dashed border-nirwana-border py-10 text-center text-sm text-nirwana-muted">
            Belum ada data riwayat monitoring.
          </div>
        )}
      </div>
    </Card>
  );
}
