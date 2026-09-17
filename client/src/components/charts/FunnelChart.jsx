import { formatNumber } from '../../utils/formatters';

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)'];

// Horizontal step funnel (App Open → Login → … → Purchase) with per-step
// conversion %, drop-off, and a proportional filled bar.
const FunnelChart = ({ steps }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {steps.map((s, i) => {
      const color = PALETTE[i % PALETTE.length];
      const drop = i === 0 ? 0 : +(steps[i - 1].pct - s.pct).toFixed(1);
      return (
        <div
          key={s.step}
          className="relative flex flex-col gap-1 overflow-hidden rounded-xl border border-border p-3"
        >
          <div
            className="absolute inset-0 -z-0"
            style={{ backgroundColor: `color-mix(in oklab, ${color} ${Math.max(8, s.pct * 0.4)}%, transparent)` }}
          />
          <div className="relative z-10 flex flex-col gap-1">
            <span className="truncate text-xs font-medium text-muted-foreground">{s.step}</span>
            <span className="text-lg font-semibold tabular-nums" style={{ color }}>{s.pct}%</span>
            <span className="text-xs tabular-nums text-card-foreground">{formatNumber(s.users)}</span>
            {i > 0 && (
              <span className="text-[11px] text-[#e03131]">-{drop}% drop</span>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

export default FunnelChart;
