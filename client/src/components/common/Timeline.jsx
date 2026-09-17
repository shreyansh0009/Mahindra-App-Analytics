const Timeline = ({ items = [] }) => (
  <ul className="flex flex-col">
    {items.map((item, i) => (
      <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
        {i < items.length - 1 && (
          <span className="absolute top-3 left-[5px] h-full w-px bg-border" />
        )}
        <span
          className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: item.color || 'var(--primary)' }}
        />
        <div className="min-w-0 flex-1">{item.children}</div>
      </li>
    ))}
  </ul>
);

export default Timeline;
