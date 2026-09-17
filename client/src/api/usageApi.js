import api from './axiosInstance';

export const fetchUsageFilters = (params) => api.get('/dashboard/usage/filters', { params });
export const fetchScreenUsage = (params) => api.get('/dashboard/screen-usage', { params });
export const fetchModuleUsage = (params) => api.get('/dashboard/module-usage', { params });
export const fetchWorkflowBreak = (params) => api.get('/dashboard/workflow-break', { params });
export const fetchRoleUsage = (params) => api.get('/dashboard/role-usage', { params });
