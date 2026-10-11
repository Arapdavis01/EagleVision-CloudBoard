// ============================================================
// EAGLEVISION CLOUDBOARD — SYSTEM REQUEST SERVICE
// ============================================================
// Handles both admin (authed) and public (no-auth) endpoints.
//
// Admin endpoints (Bearer token required):
//   GET    /api/system-requests
//   GET    /api/system-requests/:id
//   GET    /api/system-requests/stats
//   PUT    /api/system-requests/:id
//   POST   /api/system-requests/:id/approve
//   POST   /api/system-requests/:id/reject
//   POST   /api/system-requests/:id/convert
//   DELETE /api/system-requests/:id
//
// Public endpoint (no auth):
//   POST   /api/public/system-requests
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[systemRequestService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}


// ============================================================
// PUBLIC API
// ============================================================
export const systemRequestService = {

  // ----------------------------------------------------------
  // Admin — read
  // ----------------------------------------------------------

  /**
   * GET /api/system-requests
   * @param {object} [filters]
   * @param {string} [filters.status]      'new' | 'reviewing' | 'approved' | 'rejected' | 'converted' | 'all'
   * @param {string} [filters.priority]    'high' | 'medium' | 'low' | 'all'
   * @param {string} [filters.search]      Free text
   * @param {string} [filters.sort]        'newest' | 'oldest' | 'priority'
   * @param {string} [filters.project_id]  Filter by linked project
   */
  getRequests: (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.status   && filters.status   !== 'all') params.append('status',     filters.status);
    if (filters.priority && filters.priority !== 'all') params.append('priority',   filters.priority);
    if (filters.search)                                 params.append('search',     filters.search);
    if (filters.sort)                                   params.append('sort',       filters.sort);
    if (filters.project_id)                             params.append('project_id', filters.project_id);

    const queryString = params.toString();
    return api(`/api/system-requests${queryString ? `?${queryString}` : ''}`);
  },

  /** GET /api/system-requests/:id */
  getRequest: (id) =>
    api(`/api/system-requests/${segment(id)}`),

  /** GET /api/system-requests/stats */
  getStats: () =>
    api('/api/system-requests/stats'),


  // ----------------------------------------------------------
  // Admin — mutate
  // ----------------------------------------------------------

  /** PUT /api/system-requests/:id */
  updateRequest: (id, data) =>
    api(`/api/system-requests/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** POST /api/system-requests/:id/approve */
  approveRequest: (id) =>
    api(`/api/system-requests/${segment(id)}/approve`, { method: 'POST' }),

  /** POST /api/system-requests/:id/reject */
  rejectRequest: (id, reason = '') =>
    api(`/api/system-requests/${segment(id)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** POST /api/system-requests/:id/convert */
  convertToProject: (id, projectId) =>
    api(`/api/system-requests/${segment(id)}/convert`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId }),
    }),

  /** DELETE /api/system-requests/:id */
  deleteRequest: (id) =>
    api(`/api/system-requests/${segment(id)}`, { method: 'DELETE' }),


  // ----------------------------------------------------------
  // Public — no auth required
  // ----------------------------------------------------------

  /**
   * POST /api/public/system-requests
   * Submit a new request from the public Qoech form.
   * @param {object} data
   */
  submitRequest: (data) =>
    api('/api/public/system-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,   // ← public endpoint — don't attach Bearer header
    }),
};
