import { statusOf } from "@/lib/format";

export function StatusBadge({ status }) {
  const meta = statusOf(status);

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${meta.border} ${meta.bg} ${meta.tone}`}>
      {meta.header}
    </span>
  );
}
