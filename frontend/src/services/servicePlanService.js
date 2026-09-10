import { api } from './api.js';

export const servicePlanService = {
  // ==================== PLANS CRUD ====================

  // Get all plans with optional filters and sorting
  getPlans: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.project_id) params.append('project_id', filters.project_id);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    
    const queryString = params.toString();
    return api(`/api/service-plans${queryString ? `?${queryString}` : ''}`);
  },

  // Get single plan
  getPlan: (id) =>
    api(`/api/service-plans/${id}`),

  // Create plan
  createPlan: (data) =>
    api('/api/service-plans', { method: 'POST', body: JSON.stringify(data) }),

  // Update plan
  updatePlan: (id, data) =>
    api(`/api/service-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Delete plan
  deletePlan: (id) =>
    api(`/api/service-plans/${id}`, { method: 'DELETE' }),

  // ==================== PLAN ACTIONS ====================

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

  // ==================== STATS ====================

  // Get stats (with trends)
  getStats: () =>
    api('/api/service-plans/stats'),

  // ==================== TEMPLATES ====================

  // Get all templates
  getTemplates: () =>
    api('/api/service-plans/templates'),

  // Get single template
  getTemplate: (id) =>
    api(`/api/service-plans/templates/${id}`),

  // Create plan from template
  createFromTemplate: (templateId, data) =>
    api(`/api/service-plans/templates/${templateId}/create`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Create new template
  createTemplate: (data) =>
    api('/api/service-plans/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Delete template
  deleteTemplate: (id) =>
    api(`/api/service-plans/templates/${id}`, { method: 'DELETE' }),

  // ==================== BULK ACTIONS ====================

  // Bulk update status
  bulkUpdateStatus: (planIds, status) =>
    api('/api/service-plans/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ planIds, status })
    }),

  // Bulk update priority
  bulkUpdatePriority: (planIds, priority) =>
    api('/api/service-plans/bulk/priority', {
      method: 'POST',
      body: JSON.stringify({ planIds, priority })
    }),

  // Bulk delete
  bulkDelete: (planIds) =>
    api('/api/service-plans/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ planIds })
    }),

  // ==================== CALENDAR ====================

  // Get calendar data (plans grouped by date)
  getCalendarData: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    if (filters.project_id) params.append('project_id', filters.project_id);
    
    const queryString = params.toString();
    return api(`/api/service-plans/calendar${queryString ? `?${queryString}` : ''}`);
  }
};
