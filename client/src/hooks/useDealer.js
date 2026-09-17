import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchDealerFilters,
  fetchDealerSummary,
  fetchDealerAnalytics,
  fetchGeography,
} from '../api/dealerApi';

const opts = { staleTime: 60_000, placeholderData: keepPreviousData };

// Filter options are read from the collection, so they change only when new
// dealerships appear — held longer than the report queries.
export const useDealerFilterOptions = (params, enabled = true) =>
  useQuery({
    queryKey: ['dealer', 'filters', params],
    queryFn: () => fetchDealerFilters(params),
    staleTime: 300_000,
    enabled,
    placeholderData: keepPreviousData,
  });

export const useDealerSummary = (params) =>
  useQuery({ queryKey: ['dealer', 'summary', params], queryFn: () => fetchDealerSummary(params), ...opts });

export const useDealerAnalytics = (params) =>
  useQuery({ queryKey: ['dealer', 'analytics', params], queryFn: () => fetchDealerAnalytics(params), ...opts });

export const useGeography = (params) =>
  useQuery({ queryKey: ['dealer', 'geography', params], queryFn: () => fetchGeography(params), ...opts });
