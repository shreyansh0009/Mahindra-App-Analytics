import api from './axiosInstance';

export const fetchSummary = (params) => api.get('/dashboard/summary', { params });
export const fetchGraphs = (params) => api.get('/dashboard/graphs', { params });
export const fetchRealtime = () => api.get('/dashboard/realtime');
export const fetchDevices = (params) => api.get('/dashboard/devices', { params });
export const fetchAppVersions = (params) => api.get('/dashboard/app-versions', { params });
export const fetchFunnel = (params) => api.get('/dashboard/funnel', { params });
export const fetchRetentionCurve = (params) => api.get('/dashboard/retention-curve', { params });
export const fetchSessionOverview = (params) => api.get('/dashboard/session-overview', { params });
