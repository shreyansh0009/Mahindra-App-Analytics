import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchRoleFilters,
  fetchRoleSummary,
  fetchRoleAnalytics,
  fetchRoleUserTable,
  fetchUserClassification,
} from '../api/roleApi';

const opts = { staleTime: 60_000, placeholderData: keepPreviousData };

export const useRoleFilterOptions = (params, enabled = true) =>
  useQuery({
    queryKey: ['role', 'filters', params],
    queryFn: () => fetchRoleFilters(params),
    staleTime: 300_000,
    enabled,
    placeholderData: keepPreviousData,
  });

export const useRoleSummary = (params) =>
  useQuery({ queryKey: ['role', 'summary', params], queryFn: () => fetchRoleSummary(params), ...opts });

export const useRoleAnalytics = (params) =>
  useQuery({ queryKey: ['role', 'analytics', params], queryFn: () => fetchRoleAnalytics(params), ...opts });

export const useRoleUserTable = (params) =>
  useQuery({ queryKey: ['role', 'users', params], queryFn: () => fetchRoleUserTable(params), ...opts });

export const useUserClassification = (params) =>
  useQuery({ queryKey: ['role', 'classification', params], queryFn: () => fetchUserClassification(params), ...opts });
