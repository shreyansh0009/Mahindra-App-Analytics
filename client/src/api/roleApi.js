import api from './axiosInstance';
import axiosInstance from './axiosInstance';

export const fetchRoleFilters = (params) => api.get('/dashboard/role-analytics/filters', { params });
export const fetchRoleSummary = (params) => api.get('/dashboard/role-analytics/summary', { params });
export const fetchRoleAnalytics = (params) => api.get('/dashboard/role-analytics', { params });
export const fetchRoleUserTable = (params) => api.get('/dashboard/role-analytics/users', { params });
export const fetchUserClassification = (params) => api.get('/dashboard/user-classification', { params });

// The shared response interceptor unwraps to `response.data` regardless of
// content type, so with responseType: 'blob' this resolves straight to the
// xlsx Blob.
export const exportUsers = (params) =>
  axiosInstance.request({
    url: '/dashboard/export/users',
    method: 'get',
    params,
    responseType: 'blob',
  });
