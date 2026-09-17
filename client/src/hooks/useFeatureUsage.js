import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchFeatureUsage } from '../api/featureUsageApi';

export const useFeatureUsage = (params) =>
  useQuery({
    queryKey: ['feature-usage', params],
    queryFn: () => fetchFeatureUsage(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
