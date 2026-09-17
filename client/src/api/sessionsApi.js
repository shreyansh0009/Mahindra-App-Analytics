import api from './axiosInstance';

export const fetchSessions = (params) => api.get('/sessions', { params });
export const fetchSession = (sessionId) => api.get(`/sessions/${sessionId}`);
export const fetchSessionStats = (params) => api.get('/sessions/stats', { params });
export const fetchSessionHourly = (params) => api.get('/sessions/hourly', { params });
export const fetchSessionTrend = (params) => api.get('/sessions/trend', { params });
