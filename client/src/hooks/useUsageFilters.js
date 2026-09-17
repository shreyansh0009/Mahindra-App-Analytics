import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useFilters } from '../context/FiltersContext';

// Per-page filter state for the usage analytics modules. The Zone/Dealer/etc.
// dimensions are local to the page, but the date range is read from and written
// back to the global FiltersContext: these pages used to keep a private range,
// so the header's date picker silently did nothing on them and the page showed
// two date controls that disagreed.
const PRESET_RANGES = {
  today: () => [dayjs().startOf('day'), dayjs()],
  yesterday: () => [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')],
  last7: () => [dayjs().subtract(6, 'day'), dayjs()],
  last30: () => [dayjs().subtract(29, 'day'), dayjs()],
};

export const useUsageFilters = (initial = {}) => {
  const { dateRange: range, setDateRange: setRange } = useFilters();
  const DEFAULT_FILTERS = {
    role: null, designation: null, userCategory: null,
    appVersion: null, platform: null, search: '',
    // Dealership dimensions — the dealer's billing address, not the user's.
    state: null, city: null, dealerId: null, dealerCategory: null,
  };

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initial });
  const [page, setPage] = useState({ page: 1, limit: 20 });

  // State → city → dealer genuinely nest, so narrowing an outer level clears the
  // inner ones. Without this a stale city from another state survives the change
  // and the page reports zero rows for a selection that looks valid.
  const DEPENDENTS = { state: ['city', 'dealerId'], city: ['dealerId'] };

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      (DEPENDENTS[key] || []).forEach((k) => { next[k] = null; });
      return next;
    });
    setPage((p) => ({ ...p, page: 1 }));
  };

  // Derived, not stored: the range can also be changed from the header picker,
  // and a stored preset would go stale and mislabel the range on this page.
  // `customMode` only forces the calendar open after the user picks "Custom";
  // otherwise the label follows whatever range is actually set.
  const [customMode, setCustomMode] = useState(false);

  const preset = useMemo(() => {
    if (customMode) return 'custom';
    const fmt = (r) => `${r[0]?.format('YYYY-MM-DD')}|${r[1]?.format('YYYY-MM-DD')}`;
    if (!range?.[0] || !range?.[1]) return 'custom';
    const current = fmt(range);
    return Object.keys(PRESET_RANGES).find((k) => fmt(PRESET_RANGES[k]()) === current) ?? 'custom';
  }, [range, customMode]);

  const applyPreset = (key, customRange) => {
    if (key === 'custom') {
      setCustomMode(true);
      if (customRange) setRange(customRange);
    } else if (PRESET_RANGES[key]) {
      setCustomMode(false);
      setRange(PRESET_RANGES[key]());
    }
    setPage((p) => ({ ...p, page: 1 }));
  };

  const reset = () => {
    setFilters({ ...DEFAULT_FILTERS });
    applyPreset('last30');
    setPage({ page: 1, limit: 20 });
  };

  const queryParams = useMemo(() => {
    const clean = { startDate: range[0]?.format('YYYY-MM-DD'), endDate: range[1]?.format('YYYY-MM-DD') };
    Object.entries(filters).forEach(([k, v]) => { if (v) clean[k] = v; });
    return { ...clean, ...page };
  }, [filters, range, page]);

  return { preset, range, filters, page, setFilter, applyPreset, reset, setPage, queryParams };
};
