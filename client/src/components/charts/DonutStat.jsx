import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../../utils/formatters';

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)'];

// Donut with a centered total and a legend list (name • % • count) beside it.
const DonutStat = ({ data, centerLabel = 'Total', total, nameKey = 'name', valueKey = 'value' }) => {
  const sum = total ?? data.reduce((acc, d) => acc + d[valueKey], 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d[nameKey]} fill={PALETTE[i % PALETTE.length]} stroke="var(--card)" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-card-foreground">{formatNumber(sum)}</span>
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        {data.map((d, i) => (
          <div key={d[nameKey]} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-card-foreground">{d[nameKey]}</span>
            <span className="font-medium tabular-nums text-card-foreground">
              {d.pct ?? `${Math.round((d[valueKey] / sum) * 100)}%`}
            </span>
            <span className="w-12 text-right tabular-nums text-muted-foreground">{formatNumber(d[valueKey])}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutStat;
