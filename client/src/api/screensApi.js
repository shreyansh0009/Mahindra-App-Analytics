import api from './axiosInstance';

export const fetchScreenAnalytics = (params) => api.get('/screens/analytics', { params });
export const fetchTopScreens = (params) => api.get('/screens/top', { params });
export const fetchScreenTrend = (screenName, params) =>
  api.get(`/screens/${encodeURIComponent(screenName)}/trend`, { params });
