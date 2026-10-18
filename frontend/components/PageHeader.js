export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className = "",
}) {
  return (
    <header className={`page-heading ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children && <div className="page-heading-action">{children}</div>}
    </header>
  );
}
