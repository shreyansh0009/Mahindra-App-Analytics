import { createContext, useContext, useState, useEffect } from 'react';
import dayjs from 'dayjs';

const defaultRange = [dayjs().subtract(29, 'day'), dayjs()];

const FiltersContext = createContext(null);

export const FiltersProvider = ({ children }) => {
  const [dateRange, setDateRange] = useState(defaultRange);
  const [platform, setPlatform] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(
    () => localStorage.getItem('selectedUserId') || null
  );

  useEffect(() => {
    if (selectedUserId) localStorage.setItem('selectedUserId', selectedUserId);
    else localStorage.removeItem('selectedUserId');
  }, [selectedUserId]);

  const dateParams = {
    startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
    endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
  };

  // Single source of truth for API params: date range + optional user scope + platform.
  // Every page/hook spreads this so the sidebar user selection scopes the whole app.
  const queryParams = {
    ...dateParams,
    ...(selectedUserId ? { userId: selectedUserId } : {}),
    ...(platform ? { platform } : {}),
  };

  return (
    <FiltersContext.Provider
      value={{
        dateRange,
        setDateRange,
        platform,
        setPlatform,
        dateParams,
        queryParams,
        selectedUserId,
        setSelectedUserId,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error('useFilters must be used within FiltersProvider');
  return ctx;
};
