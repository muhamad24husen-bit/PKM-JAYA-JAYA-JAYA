import { Area, AreaChart, ResponsiveContainer } from "recharts";

function Sparkline({ data, color }) {
  const gradientId = `spark-${color.replace("#", "")}`;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 opacity-70">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
            style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SummaryCard({
  title,
  value,
  suffix,
  icon: Icon,
  tone = "text-[#dce4e4]",
  accent = "#00f2ff",
  children,
  trend,
  active,
  danger,
  pulse,
}) {
  const valueText = String(value);
  const valueSize = valueText.length > 7 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl";
  const sparkColor = danger ? "#ff8f89" : accent;
  const hasTrend = Array.isArray(trend) && trend.length > 1;

  return (
    <section
      className={`group relative min-h-[150px] overflow-hidden rounded-2xl border bg-[#161b26] p-5 transition-shadow duration-300 ${
        danger
          ? "border-[#ff8f89]/55 shadow-danger"
          : active
            ? "border-[#00f2ff]/40 hover:shadow-glow"
            : "border-white/10 hover:border-white/20"
      } ${pulse ? "animate-pulse" : ""}`}
    >
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${sparkColor}, transparent)`,
          opacity: active || danger ? 0.9 : 0.25,
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-[#b9cacb]">{title}</h3>
        <span className={`grid h-9 w-9 place-items-center rounded-lg bg-white/5 ${tone}`}>
          <Icon size={18} strokeWidth={1.5} />
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-2">
        <span className={`max-w-full truncate font-display font-bold leading-none ${valueSize} ${tone}`}>{value}</span>
        {suffix ? <span className="mb-1 text-sm text-[#849495]">{suffix}</span> : null}
        {children}
      </div>

      {hasTrend ? <Sparkline data={trend.map((v) => ({ v }))} color={sparkColor} /> : null}
    </section>
  );
}
