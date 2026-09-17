import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
} from '@/components/ui/chart';

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)'];

const BarChart = ({
  data = [],
  series = [],
  xKey = 'name',
  height = 300,
  colors,
  layout = 'vertical',
}) => {
  const palette = colors?.length ? colors : PALETTE;
  const isVertical = layout === 'vertical';
  const singleSeries = series.length === 1;

  const config = series.reduce((acc, s, i) => {
    acc[s.key] = { label: s.label, color: palette[i % palette.length] };
    return acc;
  }, {});

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ReBarChart
        data={data}
        layout={isVertical ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 20, left: isVertical ? 80 : 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={!isVertical} vertical={isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis type="category" dataKey={xKey} tickLine={false} axisLine={false} width={80} fontSize={12} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
          </>
        )}
        <ChartTooltip cursor={{ fill: 'var(--muted)' }} content={<ChartTooltipContent />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-3 gap-y-1" />} />}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={`var(--color-${s.key})`}
            radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {singleSeries && data.map((_, idx) => (
              <Cell key={idx} fill={palette[idx % palette.length]} />
            ))}
          </Bar>
        ))}
      </ReBarChart>
    </ChartContainer>
  );
};

export default BarChart;
