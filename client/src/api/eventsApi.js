import api from './axiosInstance';

export const fetchEvents = (params) => api.get('/events', { params });
export const fetchEventDistribution = (params) => api.get('/events/distribution', { params });
export const fetchTopEvents = (params) => api.get('/events/top', { params });
export const fetchEventStats = (params) => api.get('/events/stats', { params });
export const fetchEventTrend = (params) => api.get('/events/trend', { params });
export const fetchEventSummary = (params) => api.get('/events/summary', { params });
