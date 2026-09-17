import api from './axiosInstance';

export const fetchFeatureUsage = (params) => api.get('/dashboard/feature-usage', { params });
