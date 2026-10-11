// ============================================================
// EAGLEVISION CLOUDBOARD — SERVICE PLAN SERVICE
// ============================================================
// All service plan API calls (plans, templates, actions, bulk,
// stats, calendar).
//
// Endpoints covered:
//   GET    /api/service-plans
//   GET    /api/service-plans/:id
//   POST   /api/service-plans
//   PUT    /api/service-plans/:id
//   DELETE /api/service-plans/:id
//
//   POST   /api/service-plans/:id/approve
//   POST   /api/service-plans/:id/complete
//   POST   /api/service-plans/:id/reopen
//   POST   /api/service-plans/:id/cancel
//
//   GET    /api/service-plans/stats
//
//   GET    /api/service-plans/templates
//   GET    /api/service-plans/templates/:id
//   POST   /api/service-plans/templates
//   POST   /api/service-plans/templates/:id/create
//   DELETE /api/service-plans/templates/:id
//
//   POST   /api/service-plans/bulk/status
//   POST   /api/service-plans/bulk/priority
//   POST   /api/service-plans/bulk/delete
//
//   GET    /api/service-plans/calendar
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[servicePlanService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  // Copy known filter keys (values are auto-escaped by URLSearchParams)
  const KEYS = ['project_id', 'status', 'priority', 'search', 'sort', 'month', 'year'];

  KEYS.forEach((key) => {
    const v = filters[key];
    if (v === null || v === undefined || v === '' || v === 'all') return;
    params.append(key, String(v));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}


// ============================================================
// PUBLIC API
// ============================================================
export const servicePlanService = {

  // ----------------------------------------------------------
  // Plans CRUD
  // ----------------------------------------------------------

  /** GET /api/service-plans */
  getPlans: (filters = {}) =>
    api(`/api/service-plans${buildQuery(filters)}`),

  /** GET /api/service-plans/:id */
  getPlan: (id) =>
    api(`/api/service-plans/${segment(id)}`),

  /** POST /api/service-plans */
  createPlan: (data) =>
    api('/api/service-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /api/service-plans/:id */
  updatePlan: (id, data) =>
    api(`/api/service-plans/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/service-plans/:id */
  deletePlan: (id) =>
    api(`/api/service-plans/${segment(id)}`, { method: 'DELETE' }),


  // ----------------------------------------------------------
  // Plan actions
  // ----------------------------------------------------------

  /** POST /api/service-plans/:id/approve — creates a service record */
  approvePlan: (id) =>
    api(`/api/service-plans/${segment(id)}/approve`, { method: 'POST' }),

  /** POST /api/service-plans/:id/complete */
  completePlan: (id) =>
    api(`/api/service-plans/${segment(id)}/complete`, { method: 'POST' }),

  /** POST /api/service-plans/:id/reopen */
  reopenPlan: (id) =>
    api(`/api/service-plans/${segment(id)}/reopen`, { method: 'POST' }),

  /** POST /api/service-plans/:id/cancel */
  cancelPlan: (id) =>
    api(`/api/service-plans/${segment(id)}/cancel`, { method: 'POST' }),


  // ----------------------------------------------------------
  // Stats
  // ----------------------------------------------------------

  /** GET /api/service-plans/stats */
  getStats: () =>
    api('/api/service-plans/stats'),


  // ----------------------------------------------------------
  // Templates
  // ----------------------------------------------------------

  /** GET /api/service-plans/templates */
  getTemplates: () =>
    api('/api/service-plans/templates'),

  /** GET /api/service-plans/templates/:id */
  getTemplate: (id) =>
    api(`/api/service-plans/templates/${segment(id)}`),

  /** POST /api/service-plans/templates */
  createTemplate: (data) =>
    api('/api/service-plans/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** POST /api/service-plans/templates/:id/create */
  createFromTemplate: (templateId, data) =>
    api(`/api/service-plans/templates/${segment(templateId, 'templateId')}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/service-plans/templates/:id */
  deleteTemplate: (id) =>
    api(`/api/service-plans/templates/${segment(id)}`, { method: 'DELETE' }),


  // ----------------------------------------------------------
  // Bulk actions
  // ----------------------------------------------------------

  /**
   * POST /api/service-plans/bulk/status
   * NOTE: payload uses `planIds` (camelCase). If the backend expects
   * `plan_ids`, change both key + value here.
   */
  bulkUpdateStatus: (planIds, status) =>
    api('/api/service-plans/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ planIds, status }),
    }),

  /** POST /api/service-plans/bulk/priority */
  bulkUpdatePriority: (planIds, priority) =>
    api('/api/service-plans/bulk/priority', {
      method: 'POST',
      body: JSON.stringify({ planIds, priority }),
    }),

  /** POST /api/service-plans/bulk/delete */
  bulkDelete: (planIds) =>
    api('/api/service-plans/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ planIds }),
    }),


  // ----------------------------------------------------------
  // Calendar
  // ----------------------------------------------------------
  // NOTE: only used if the page delegates grouping to the server.
  // The current servicePlanner.js groups client-side, so this may
  // be unused — verify with:
  //   grep -rn "getCalendarData" frontend/src

  /** GET /api/service-plans/calendar */
  getCalendarData: (filters = {}) =>
    api(`/api/service-plans/calendar${buildQuery(filters)}`),
};
