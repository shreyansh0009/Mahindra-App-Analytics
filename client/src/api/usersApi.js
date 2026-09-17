import api from './axiosInstance';

export const fetchUsers = (params) => api.get('/users', { params });
export const fetchUser = (userId) => api.get(`/users/${userId}`);
export const fetchUserTimeline = (userId, params) => api.get(`/users/${userId}/timeline`, { params });
export const fetchUserSessions = (userId, params) => api.get(`/users/${userId}/sessions`, { params });
export const fetchTopUsers = (params) => api.get('/users/top', { params });
export const fetchActiveUsers = () => api.get('/users/active');
export const fetchUserStats = (params) => api.get('/users/stats', { params });
export const fetchDemographics = (params) => api.get('/users/demographics', { params });
