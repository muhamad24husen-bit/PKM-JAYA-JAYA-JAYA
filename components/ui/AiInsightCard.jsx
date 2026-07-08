import { Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/telemetry";

export function AiInsightCard({ insight }) {
  const hasText = Boolean(insight?.text);

  return (
    <section className="rounded-card border border-nirwana-accent/20 bg-nirwana-accentSoft/50 p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-nirwana-accent text-white">
          <Sparkles size={16} />
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-accent">AI Insight</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-nirwana-text">
        {hasText
          ? insight.text
          : insight?.error || "Menghasilkan insight pertama, mohon tunggu sebentar..."}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-nirwana-muted">
        <span>Dihasilkan model AI dari data monitoring terkini &middot; bukan dasar diagnosis klinis</span>
        {insight?.generatedAt ? <span className="shrink-0">Diperbarui {formatDateTime(insight.generatedAt)}</span> : null}
      </div>
    </section>
  );
}
