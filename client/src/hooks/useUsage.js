import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchUsageFilters,
  fetchScreenUsage,
  fetchModuleUsage,
  fetchWorkflowBreak,
  fetchRoleUsage,
} from '../api/usageApi';

const opts = { staleTime: 60_000, placeholderData: keepPreviousData };

export const useUsageFilterOptions = (params, enabled = true) =>
  useQuery({
    queryKey: ['usage', 'filters', params],
    queryFn: () => fetchUsageFilters(params),
    staleTime: 300_000,
    enabled,
    // Retain the prior option lists while refetching for a new zone/dealer so
    // the Select items never momentarily empty out (which would make Base UI
    // fall back to the placeholder and appear to clear the current selection).
    placeholderData: keepPreviousData,
  });

export const useScreenUsage = (params) =>
  useQuery({ queryKey: ['usage', 'screen', params], queryFn: () => fetchScreenUsage(params), ...opts });

export const useModuleUsage = (params) =>
  useQuery({ queryKey: ['usage', 'module', params], queryFn: () => fetchModuleUsage(params), ...opts });

export const useWorkflowBreak = (params) =>
  useQuery({ queryKey: ['usage', 'workflow', params], queryFn: () => fetchWorkflowBreak(params), ...opts });

export const useRoleUsage = (params) =>
  useQuery({ queryKey: ['usage', 'role', params], queryFn: () => fetchRoleUsage(params), ...opts });
