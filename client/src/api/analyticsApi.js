import api from './axiosInstance';

export const fetchRetention = (params) => api.get('/analytics/retention', { params });
export const fetchUsageTrend = (params) => api.get('/analytics/usage', { params });
export const fetchEngagement = (params) => api.get('/analytics/engagement', { params });
export const fetchDailyReport = (params) => api.get('/reports/daily', { params });
export const fetchWeeklyReport = (params) => api.get('/reports/weekly', { params });
export const fetchMonthlyReport = (params) => api.get('/reports/monthly', { params });
