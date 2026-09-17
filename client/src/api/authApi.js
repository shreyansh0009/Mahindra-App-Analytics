import api from './axiosInstance';

export const login = (credentials) => api.post('/auth/login', credentials);
export const fetchMe = () => api.get('/auth/me');
export const logout = () => api.post('/auth/logout');
