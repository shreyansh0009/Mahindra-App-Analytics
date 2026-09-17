import { cn } from '@/lib/utils';
import { formatNumber } from '../../utils/formatters';

// Compact "top N" list with an inline progress bar behind each row — used for
// Top Screens, Top Events, App Versions, etc. Rows are ranked by `value`.
const RankBarList = ({ items, labelKey, valueKey, color = 'var(--chart-1)', valueFormat = formatNumber }) => {
  const max = Math.max(...items.map((it) => it[valueKey]), 1);
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => {
        const pct = Math.round((it[valueKey] / max) * 100);
        return (
          <div key={it[labelKey]} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium text-card-foreground">{it[labelKey]}</span>
              <span className="tabular-nums text-muted-foreground">{valueFormat(it[valueKey])}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all')}
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RankBarList;
