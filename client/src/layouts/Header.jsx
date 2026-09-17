import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SunIcon, MoonIcon, InfoIcon } from '@phosphor-icons/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import DateRangePicker from '../components/common/DateRangePicker';
import { useTheme } from '../context/ThemeContext';
import { useFilters } from '../context/FiltersContext';

const Header = () => {
  const { isDark, toggle } = useTheme();
  const { dateRange, setDateRange } = useFilters();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="truncate text-sm font-medium text-foreground">Mobile Analytics Dashboard</span>

      <div className="ml-auto flex items-center gap-2">
        {/* Labelled inline: this range applies to every page, not just the one
            on screen, which is not obvious from a bare date control. */}
        <div className="flex items-center gap-1.5">
          <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
            Date Range
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="What does Date Range filter?"
                  className="hidden text-muted-foreground/70 transition-colors hover:text-foreground sm:inline-flex"
                >
                  <InfoIcon className="size-3" />
                </button>
              }
            />
            <TooltipContent side="bottom">
              Applies across every page — limits all charts and tables to activity in this period.
            </TooltipContent>
          </Tooltip>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
};

export default Header;
