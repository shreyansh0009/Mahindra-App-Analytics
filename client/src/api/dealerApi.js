import api from './axiosInstance';

export const fetchDealerFilters = (params) => api.get('/dashboard/dealer-analytics/filters', { params });
export const fetchDealerSummary = (params) => api.get('/dashboard/dealer-analytics/summary', { params });
export const fetchDealerAnalytics = (params) => api.get('/dashboard/dealer-analytics', { params });

// `dimension` selects state (default) or city.
export const fetchGeography = (params) => api.get('/dashboard/geography', { params });
