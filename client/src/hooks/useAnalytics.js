import { useQuery } from '@tanstack/react-query';
import {
  fetchRetention, fetchUsageTrend, fetchEngagement,
  fetchDailyReport, fetchWeeklyReport, fetchMonthlyReport,
} from '../api/analyticsApi';

export const useRetention = (params) =>
  useQuery({
    queryKey: ['analytics', 'retention', params],
    queryFn: () => fetchRetention(params),
    staleTime: 300_000,
  });

export const useUsageTrend = (params) =>
  useQuery({
    queryKey: ['analytics', 'usage', params],
    queryFn: () => fetchUsageTrend(params),
    staleTime: 60_000,
  });

export const useEngagement = (params) =>
  useQuery({
    queryKey: ['analytics', 'engagement', params],
    queryFn: () => fetchEngagement(params),
    staleTime: 60_000,
  });

export const useDailyReport = (params) =>
  useQuery({
    queryKey: ['reports', 'daily', params],
    queryFn: () => fetchDailyReport(params),
    staleTime: 300_000,
  });

export const useWeeklyReport = (params) =>
  useQuery({
    queryKey: ['reports', 'weekly', params],
    queryFn: () => fetchWeeklyReport(params),
    staleTime: 300_000,
  });

export const useMonthlyReport = (params) =>
  useQuery({
    queryKey: ['reports', 'monthly', params],
    queryFn: () => fetchMonthlyReport(params),
    staleTime: 300_000,
  });
