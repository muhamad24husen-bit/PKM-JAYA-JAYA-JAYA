export function SummaryCard({ title, value, icon: Icon, tone = "text-nirwana-text", danger, pulse }) {
  return (
    <section
      className={`rounded-card border bg-nirwana-surface p-5 ${
        danger ? "border-nirwana-hipoksia/30" : "border-nirwana-border"
      } ${pulse ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">{title}</h3>
        <span className={`grid h-9 w-9 place-items-center rounded-lg bg-nirwana-surfaceMuted ${tone}`}>
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <p className={`mt-5 truncate text-3xl font-semibold leading-none ${tone}`}>{value}</p>
    </section>
  );
}
