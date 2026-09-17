import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, Search, X } from 'lucide-react';
import { useUsageFilterOptions } from '../../hooks/useUsage';
import { useRoleFilterOptions } from '../../hooks/useRole';
import { useDealerFilterOptions } from '../../hooks/useDealer';
import FilterField from './FilterField';
import { filterMeta } from '../../constants/filterMeta';

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
];

// Options arrive either as plain strings (states, cities, roles) or as objects
// whose stored value differs from its label — a dealer filters by accountId but
// reads as its name. Normalise both to { value, label } here so callers just
// pass whatever the API returned.
const toOption = (o) =>
  (typeof o === 'string' ? { value: o, label: o } : { value: o.id ?? o.key, label: o.name ?? o.label });

// A single shadcn Select bound to one filter key. `all` clears the selection.
// `name` keys into FILTER_META for the label and description; the unselected
// state reads "All <label>" so the dimension is named even when nothing is
// chosen.
const FilterSelect = ({ name, value, options = [], onChange, width = 130 }) => {
  const items = options.map(toOption).filter((o) => o.value);
  const { label } = filterMeta(name);
  const allLabel = `All ${label}`;

  return (
    <FilterField name={name}>
      <Select
        value={value ?? '__all__'}
        onValueChange={(v) => onChange(v === '__all__' ? null : v)}
      >
        <SelectTrigger size="sm" className="h-8" style={{ minWidth: width }}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="__all__">{allLabel}</SelectItem>
            {items.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FilterField>
  );
};

/**
 * Reusable filter bar for every usage analytics page. `show` selects which
 * dimension filters to render (screen usage wants all of them; workflow only
 * a subset). Driven entirely by the `useUsageFilters` state object.
 */
/**
 * `source` picks which filter-options endpoint backs the dropdowns:
 * 'usage' (default) hits the synthetic usageTaxonomy-based /usage/filters;
 * 'role' hits the real User-collection-backed /role-analytics/filters (needed
 * for Category, which the usage taxonomy does not know about);
 * 'dealer' merges the role options with /dealer-analytics/filters, whose
 * state/city/dealer lists are read from the data rather than hardcoded — so a
 * dropdown can never offer a selection that returns nothing.
 */
const UsageFilters = ({
  state,
  show = ['role', 'appVersion', 'platform', 'search'],
  source = 'usage',
}) => {
  const { preset, range, filters, applyPreset, setFilter, reset } = state;
  const [calOpen, setCalOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const { data: usageOpts } = useUsageFilterOptions({}, source === 'usage');
  const { data: roleOpts } = useRoleFilterOptions({}, source === 'role' || source === 'dealer');
  const { data: dealerOpts } = useDealerFilterOptions({}, source === 'dealer');
  const base = (source === 'usage' ? usageOpts : roleOpts)?.data || {};
  const o = source === 'dealer' ? { ...base, ...(dealerOpts?.data || {}) } : base;

  // Narrow the dependent lists to the current selection, so picking a state
  // leaves only that state's cities and dealers on offer.
  const cityOptions = o.cities || [];
  const dealerOptions = (o.dealers || []).filter((d) => !filters.state || d.state === filters.state);

  const has = (k) => show.includes(k);
  const dateLabel = range?.[0] && range?.[1]
    ? `${range[0].format('MMM D')} – ${range[1].format('MMM D, YYYY')}`
    : 'Select range';

  const activeCount = Object.entries(filters).filter(([, v]) => v).length;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
      {/* Date preset */}
      <FilterField name="dateRange">
        <Select value={preset} onValueChange={(v) => applyPreset(v)}>
          <SelectTrigger size="sm" className="h-8 min-w-[120px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FilterField>

      {preset === 'custom' && (
        <FilterField name="dateRange" label="Custom Range" description="The exact start and end dates this page reports on.">
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal">
                <CalendarDays className="size-3.5" />
                <span className="hidden sm:inline">{dateLabel}</span>
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={range?.[0]?.toDate()}
              disabled={{ after: new Date() }}
              // Same half-picked-range handling as DateRangePicker: without a
              // draft, the first click had nowhere to land and the calendar
              // appeared frozen.
              selected={draft ?? { from: range?.[0]?.toDate(), to: range?.[1]?.toDate() }}
              onSelect={(r) => {
                setDraft(r ?? null);
                if (r?.from && r?.to) {
                  applyPreset('custom', [dayjs(r.from).startOf('day'), dayjs(r.to).endOf('day')]);
                  setDraft(null);
                  setCalOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        </FilterField>
      )}

      {has('designation') && <FilterSelect name="designation" value={filters.designation} options={o.roles} onChange={(v) => setFilter('designation', v)} />}
      {has('role') && <FilterSelect name="role" value={filters.role} options={o.roles} onChange={(v) => setFilter('role', v)} />}
      {/* Passed as objects so the menu reads "Frequent User", not the raw key. */}
      {has('userCategory') && (
        <FilterSelect
          name="userCategory"
          value={filters.userCategory}
          options={o.userCategories}
          onChange={(v) => setFilter('userCategory', v)}
          width={150}
        />
      )}
      {has('state') && <FilterSelect name="state" value={filters.state} options={o.states} onChange={(v) => setFilter('state', v)} />}
      {has('city') && <FilterSelect name="city" value={filters.city} options={cityOptions} onChange={(v) => setFilter('city', v)} />}
      {has('dealer') && <FilterSelect name="dealer" value={filters.dealerId} options={dealerOptions} onChange={(v) => setFilter('dealerId', v)} width={200} />}
      {has('dealerCategory') && <FilterSelect name="dealerCategory" value={filters.dealerCategory} options={o.dealerCategories} onChange={(v) => setFilter('dealerCategory', v)} />}
      {has('appVersion') && <FilterSelect name="appVersion" value={filters.appVersion} options={o.appVersions} onChange={(v) => setFilter('appVersion', v)} />}
      {has('platform') && <FilterSelect name="platform" value={filters.platform} options={o.platforms} onChange={(v) => setFilter('platform', v)} />}

      {has('search') && (
        <FilterField name="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Name, email, Star ID…"
              className="h-8 w-[190px] pl-8 text-xs"
            />
          </div>
        </FilterField>
      )}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" onClick={reset}>
          <X className="size-3.5" /> Clear
        </Button>
      )}
    </div>
  );
};

export default UsageFilters;
