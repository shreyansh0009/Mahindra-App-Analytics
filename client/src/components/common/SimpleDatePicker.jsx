import dayjs from 'dayjs';

// 'week' mode still uses a native date input — the backend buckets any date
// within the week server-side, same as the plain date it received before.
const TYPE_MAP = {
  date: 'date',
  week: 'date',
  month: 'month',
};

const SimpleDatePicker = ({ mode = 'date', value, onChange }) => {
  const max = dayjs().format(mode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');

  return (
    <input
      type={TYPE_MAP[mode]}
      value={value}
      max={max}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
    />
  );
};

export default SimpleDatePicker;
