import { api } from './api.js';

export const servicePlanService = {
  // Get all plans with optional filters
  getPlans: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.project_id) params.append('project_id', filters.project_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    return api(`/api/service-plans${queryString ? `?${queryString}` : ''}`);
  },

  // Get single plan
  getPlan: (id) =>
    api(`/api/service-plans/${id}`),

  // Get stats
  getStats: () =>
    api('/api/service-plans/stats'),

  // Create plan
  createPlan: (data) =>
    api('/api/service-plans', { method: 'POST', body: JSON.stringify(data) }),

  // Update plan
  updatePlan: (id, data) =>
    api(`/api/service-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Delete plan
  deletePlan: (id) =>
    api(`/api/service-plans/${id}`, { method: 'DELETE' }),

  // Approve plan (creates service record)
  approvePlan: (id) =>
    api(`/api/service-plans/${id}/approve`, { method: 'POST' }),

  // Complete plan
  completePlan: (id) =>
    api(`/api/service-plans/${id}/complete`, { method: 'POST' }),

  // Reopen plan
  reopenPlan: (id) =>
    api(`/api/service-plans/${id}/reopen`, { method: 'POST' }),

  // Cancel plan
  cancelPlan: (id) =>
    api(`/api/service-plans/${id}/cancel`, { method: 'POST' }),
};
