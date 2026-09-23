import { api } from './api.js';

export const systemRequestService = {
  // ==================== ADMIN METHODS ====================

  // Get all requests with optional filters
  getRequests: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.project_id) params.append('project_id', filters.project_id);

    const queryString = params.toString();
    return api(`/api/system-requests${queryString ? `?${queryString}` : ''}`);
  },

  // Get a single request
  getRequest: (id) =>
    api(`/api/system-requests/${id}`),

  // Get dashboard stats
  getStats: () =>
    api('/api/system-requests/stats'),

  // Update a request (status, priority, admin notes)
  updateRequest: (id, data) =>
    api(`/api/system-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Approve a request
  approveRequest: (id) =>
    api(`/api/system-requests/${id}/approve`, { method: 'POST' }),

  // Reject a request
  rejectRequest: (id, reason = '') =>
    api(`/api/system-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Mark a request as converted to a project
  convertToProject: (id, projectId) =>
    api(`/api/system-requests/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId }),
    }),

  // Delete a request
  deleteRequest: (id) =>
    api(`/api/system-requests/${id}`, { method: 'DELETE' }),

  // ==================== PUBLIC METHOD ====================

  // Submit a new request (from the public Qoech form)
  // NOTE: uses a direct fetch instead of the api() helper because
  // the public endpoint doesn't need auth and might be called
  // from a different origin.
  submitRequest: async (data) => {
    const API_BASE = (await import('../config/constants.js')).API_BASE_URL;
    const response = await fetch(`${API_BASE}/api/public/system-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Submission failed' }));
      throw new Error(err.error || 'Submission failed');
    }
    return response.json();
  },
};
