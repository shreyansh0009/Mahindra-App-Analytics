import { useQuery } from '@tanstack/react-query';
import {
  fetchUsers, fetchUser, fetchUserTimeline,
  fetchUserSessions, fetchTopUsers, fetchActiveUsers,
  fetchUserStats, fetchDemographics,
} from '../api/usersApi';

export const useUserStats = (params) =>
  useQuery({
    queryKey: ['users', 'stats', params],
    queryFn: () => fetchUserStats(params),
    staleTime: 60_000,
  });

export const useDemographics = (params) =>
  useQuery({
    queryKey: ['users', 'demographics', params],
    queryFn: () => fetchDemographics(params),
    staleTime: 60_000,
  });

export const useUsers = (params) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: () => fetchUsers(params),
    staleTime: 30_000,
  });

export const useUser = (userId) =>
  useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });

export const useUserTimeline = (userId, params) =>
  useQuery({
    queryKey: ['user', userId, 'timeline', params],
    queryFn: () => fetchUserTimeline(userId, params),
    enabled: !!userId,
  });

export const useUserSessions = (userId, params) =>
  useQuery({
    queryKey: ['user', userId, 'sessions', params],
    queryFn: () => fetchUserSessions(userId, params),
    enabled: !!userId,
  });

export const useTopUsers = (params) =>
  useQuery({
    queryKey: ['users', 'top', params],
    queryFn: () => fetchTopUsers(params),
    staleTime: 60_000,
  });

export const useActiveUsers = () =>
  useQuery({
    queryKey: ['users', 'active'],
    queryFn: fetchActiveUsers,
    refetchInterval: 15_000,
  });
