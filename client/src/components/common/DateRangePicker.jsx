import { useState } from 'react';
import dayjs from 'dayjs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { useIsMobile } from '@/hooks/use-mobile';

const PRESETS = [
  { label: 'Last 7 days', getValue: () => [dayjs().subtract(6, 'day'), dayjs()] },
  { label: 'Last 30 days', getValue: () => [dayjs().subtract(29, 'day'), dayjs()] },
  { label: 'Last 90 days', getValue: () => [dayjs().subtract(89, 'day'), dayjs()] },
];

const DateRangePicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  // The calendar needs a half-finished range (`from` set, `to` still empty) to
  // stay on screen while the user picks the second date. Deriving `selected`
  // straight from `value` discarded that first click, so the calendar looked
  // frozen — nothing ever highlighted and no range could be chosen by hand.
  const [draft, setDraft] = useState(null);
  const range = draft ?? { from: value?.[0]?.toDate(), to: value?.[1]?.toDate() };

  const label = value?.[0] && value?.[1]
    ? `${value[0].format('MMM D')} – ${value[1].format('MMM D, YYYY')}`
    : 'Select range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="gap-2 font-normal">
            <CalendarBlankIcon />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        }
      />
      <PopoverContent className="w-auto max-w-[95vw] p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-border p-2 sm:flex-col sm:border-r sm:border-b-0">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start whitespace-nowrap"
                onClick={() => { setDraft(null); onChange(p.getValue()); setOpen(false); }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range.from}
            disabled={{ after: new Date() }}
            onSelect={(r) => {
              setDraft(r ?? null);
              if (r?.from && r?.to) {
                onChange([dayjs(r.from).startOf('day'), dayjs(r.to).endOf('day')]);
                setDraft(null);
                setOpen(false);
              }
            }}
            numberOfMonths={isMobile ? 1 : 2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
