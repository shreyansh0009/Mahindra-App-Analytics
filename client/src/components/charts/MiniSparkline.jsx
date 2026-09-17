import { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// Tiny gradient sparkline for KPI cards. No axes, no tooltip — pure trend cue.
const MiniSparkline = ({ data = [], color = 'var(--chart-1)', height = 40, dataKey = 'value' }) => {
  const id = `spark${useId().replace(/:/g, '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default MiniSparkline;
