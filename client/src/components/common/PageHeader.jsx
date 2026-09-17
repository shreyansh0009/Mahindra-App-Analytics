// Consistent page title block, plus any page-specific actions passed as children.
//
// HIDDEN: this used to render a second toolbar (date range, filter, refresh,
// export) carried over from the reference design. None of it was wired up — the
// date read a hardcoded "May 1 – May 31, 2024" and the three icon buttons had no
// handlers — so it appeared on six pages as a dead duplicate of the real date
// picker in the header. Restore individual controls here only once they do
// something; the working date picker lives in layouts/Header.jsx.
const PageHeader = ({ title, subtitle, emoji, actions = true, children }) => (
  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        {title} {emoji && <span aria-hidden>{emoji}</span>}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && children && (
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    )}
  </div>
);

export default PageHeader;
