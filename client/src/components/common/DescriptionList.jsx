const DescriptionList = ({ items = [] }) => (
  <dl className="flex flex-col gap-2.5">
    {items.map((item) => (
      <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
        <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
        <dd className="min-w-0 truncate text-right font-medium text-card-foreground">{item.value}</dd>
      </div>
    ))}
  </dl>
);

export default DescriptionList;
