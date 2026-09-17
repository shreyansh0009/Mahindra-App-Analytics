import { useQuery } from '@tanstack/react-query';
import {
  fetchSessions, fetchSession, fetchSessionStats, fetchSessionHourly, fetchSessionTrend,
} from '../api/sessionsApi';

export const useSessionStats = (params) =>
  useQuery({
    queryKey: ['sessions', 'stats', params],
    queryFn: () => fetchSessionStats(params),
    staleTime: 60_000,
  });

export const useSessionHourly = (params) =>
  useQuery({
    queryKey: ['sessions', 'hourly', params],
    queryFn: () => fetchSessionHourly(params),
    staleTime: 60_000,
  });

export const useSessionTrend = (params) =>
  useQuery({
    queryKey: ['sessions', 'trend', params],
    queryFn: () => fetchSessionTrend(params),
    staleTime: 60_000,
  });

export const useSessions = (params) =>
  useQuery({
    queryKey: ['sessions', params],
    queryFn: () => fetchSessions(params),
    staleTime: 30_000,
  });

export const useSession = (sessionId) =>
  useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId),
    enabled: !!sessionId,
  });
