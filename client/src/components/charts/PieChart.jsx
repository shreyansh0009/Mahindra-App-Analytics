import {
  PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
} from '@/components/ui/chart';

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-4)', 'var(--chart-3)'];

const PieChart = ({
  data = [], nameKey = 'name', valueKey = 'value', height = 300, innerRadius = 60,
}) => {
  const config = data.reduce((acc, d, i) => {
    acc[d[nameKey]] = { label: d[nameKey], color: PALETTE[i % PALETTE.length] };
    return acc;
  }, {});

  return (
    <ChartContainer config={config} className="mx-auto aspect-auto w-full" style={{ height }}>
      <RePieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} hideLabel />} />
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 60}
          paddingAngle={2}
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={d[nameKey]} fill={PALETTE[i % PALETTE.length]} stroke="var(--card)" />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey={nameKey} className="flex-wrap gap-x-3 gap-y-1" />} />
      </RePieChart>
    </ChartContainer>
  );
};

export default PieChart;
