import { useQuery } from '@tanstack/react-query';
import {
  fetchSummary, fetchGraphs, fetchRealtime, fetchDevices,
  fetchAppVersions, fetchFunnel, fetchRetentionCurve, fetchSessionOverview,
} from '../api/dashboardApi';

export const useDashboardSummary = (params) =>
  useQuery({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => fetchSummary(params),
    staleTime: 60_000,
  });

export const useDashboardGraphs = (params) =>
  useQuery({
    queryKey: ['dashboard', 'graphs', params],
    queryFn: () => fetchGraphs(params),
    staleTime: 60_000,
  });

export const useRealtime = () =>
  useQuery({
    queryKey: ['dashboard', 'realtime'],
    queryFn: fetchRealtime,
    refetchInterval: 5_000,
    staleTime: 0,
  });

export const useDevices = (params) =>
  useQuery({
    queryKey: ['dashboard', 'devices', params],
    queryFn: () => fetchDevices(params),
    staleTime: 60_000,
  });

export const useAppVersions = (params) =>
  useQuery({
    queryKey: ['dashboard', 'app-versions', params],
    queryFn: () => fetchAppVersions(params),
    staleTime: 60_000,
  });

export const useFunnel = (params) =>
  useQuery({
    queryKey: ['dashboard', 'funnel', params],
    queryFn: () => fetchFunnel(params),
    staleTime: 60_000,
  });

export const useRetentionCurve = (params) =>
  useQuery({
    queryKey: ['dashboard', 'retention-curve', params],
    queryFn: () => fetchRetentionCurve(params),
    staleTime: 300_000,
  });

export const useSessionOverview = (params) =>
  useQuery({
    queryKey: ['dashboard', 'session-overview', params],
    queryFn: () => fetchSessionOverview(params),
    staleTime: 60_000,
  });
