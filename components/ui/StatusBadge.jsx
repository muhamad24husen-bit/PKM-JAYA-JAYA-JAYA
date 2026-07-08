import { statusOf } from "@/lib/format";

export function StatusBadge({ status }) {
  const meta = statusOf(status);

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta.border} ${meta.bg} ${meta.tone}`}>
      {meta.header}
    </span>
  );
}
