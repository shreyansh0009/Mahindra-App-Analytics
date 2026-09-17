import { useQuery } from '@tanstack/react-query';
import {
  fetchEvents, fetchEventDistribution, fetchTopEvents,
  fetchEventStats, fetchEventTrend, fetchEventSummary,
} from '../api/eventsApi';

export const useEventStats = (params) =>
  useQuery({
    queryKey: ['events', 'stats', params],
    queryFn: () => fetchEventStats(params),
    staleTime: 60_000,
  });

export const useEventTrend = (params) =>
  useQuery({
    queryKey: ['events', 'trend', params],
    queryFn: () => fetchEventTrend(params),
    staleTime: 60_000,
  });

export const useEventSummary = (params) =>
  useQuery({
    queryKey: ['events', 'summary', params],
    queryFn: () => fetchEventSummary(params),
    staleTime: 60_000,
  });

export const useEvents = (params) =>
  useQuery({
    queryKey: ['events', params],
    queryFn: () => fetchEvents(params),
    staleTime: 30_000,
  });

export const useEventDistribution = (params) =>
  useQuery({
    queryKey: ['events', 'distribution', params],
    queryFn: () => fetchEventDistribution(params),
    staleTime: 60_000,
  });

export const useTopEvents = (params) =>
  useQuery({
    queryKey: ['events', 'top', params],
    queryFn: () => fetchTopEvents(params),
    staleTime: 60_000,
  });
