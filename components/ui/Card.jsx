export function Card({ title, action, className = "", bodyClassName = "", children }) {
  return (
    <section className={`rounded-card border border-nirwana-border bg-nirwana-surface p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-nirwana-border pb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-nirwana-muted">{title}</h3>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
