function Sparkline({ danger }) {
  return (
    <svg className="absolute bottom-0 left-0 h-9 w-full opacity-60" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path
        d="M0 15 Q10 10 20 20 T40 15 T60 25 T80 10 L100 25"
        fill="none"
        stroke={danger ? "#ffb4ab" : "#00f2ff"}
        strokeWidth="2"
        style={{ filter: `drop-shadow(0 0 4px ${danger ? "rgba(255,180,171,0.75)" : "rgba(0,242,255,0.75)"})` }}
      />
    </svg>
  );
}

export function SummaryCard({ title, value, suffix, icon: Icon, tone, children, active, danger, pulse }) {
  const valueText = String(value);
  const valueSize = valueText.length > 7 ? "text-3xl sm:text-4xl" : "text-3xl sm:text-5xl";

  return (
    <section
      className={`relative min-h-[138px] overflow-hidden rounded-lg border bg-[#161b26] p-5 ${
        active ? "border-t-[#00f2ff]" : "border-white/10"
      } ${danger ? "border-[#ffb4ab]" : ""} ${pulse ? "animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-xs font-bold uppercase tracking-[0.12em] text-[#b9cacb]">{title}</h3>
        <Icon className={tone} size={23} />
      </div>
      <div className="mt-7 flex items-end gap-2">
        <span className={`max-w-full truncate font-display font-bold leading-none ${valueSize} ${tone}`}>{value}</span>
        {suffix ? <span className="mb-1 text-[#dce4e4]">{suffix}</span> : null}
        {children}
      </div>
      {active ? <Sparkline danger={danger} /> : null}
    </section>
  );
}
