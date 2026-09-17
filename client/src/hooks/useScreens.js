import { useQuery } from '@tanstack/react-query';
import { fetchScreenAnalytics, fetchTopScreens, fetchScreenTrend } from '../api/screensApi';

export const useScreenAnalytics = (params) =>
  useQuery({
    queryKey: ['screens', 'analytics', params],
    queryFn: () => fetchScreenAnalytics(params),
    staleTime: 60_000,
  });

export const useTopScreens = (params) =>
  useQuery({
    queryKey: ['screens', 'top', params],
    queryFn: () => fetchTopScreens(params),
    staleTime: 60_000,
  });

export const useScreenTrend = (screenName, params) =>
  useQuery({
    queryKey: ['screen', screenName, 'trend', params],
    queryFn: () => fetchScreenTrend(screenName, params),
    enabled: !!screenName,
  });
