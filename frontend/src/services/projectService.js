// ============================================================
// EAGLEVISION CLOUDBOARD — PROJECT SERVICE
// ============================================================
// All project-related API calls. Wraps the `api()` client for
// consistent error handling + auth headers.
//
// Endpoints covered:
//   Projects         GET /api/projects
//                    GET /api/projects/:id
//                    POST /api/projects
//                    PUT /api/projects/:id
//                    DELETE /api/projects/:id
//
//   Updates          GET /api/projects/:id/updates
//                    POST /api/projects/:id/updates
//                    PUT /api/projects/updates/:updateId
//                    DELETE /api/projects/updates/:updateId
//
//   Review           POST /api/projects/:id/review-and-update
//
//   Analytics        GET /api/projects/:id/health
//                    GET /api/projects/:id/cost-analytics
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Encode a path segment safely. Throws on empty input so we
 * never hit /api/projects/undefined/...
 */
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[projectService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}

/**
 * Encode an optional query-string value.
 * Returns '' if the value is nullish.
 */
function optionalQuery(value, paramName) {
  if (value === null || value === undefined || value === '') return '';
  return `${encodeURIComponent(paramName)}=${encodeURIComponent(String(value))}`;
}

/**
 * Build a query string from a list of (name, value) pairs,
 * ignoring nullish / empty values.
 */
function buildQuery(pairs) {
  const parts = pairs
    .map(([k, v]) => optionalQuery(v, k))
    .filter(Boolean);
  return parts.length ? `?${parts.join('&')}` : '';
}


// ============================================================
// PUBLIC API
// ============================================================
export const projectService = {

  // ----------------------------------------------------------
  // Project CRUD
  // ----------------------------------------------------------

  /** GET /api/projects?search=<term> */
  getAll: (search = '') =>
    api(`/api/projects${buildQuery([['search', search]])}`),

  /** GET /api/projects/:id */
  getOne: (id) =>
    api(`/api/projects/${segment(id)}`),

  /** POST /api/projects */
  create: (data) =>
    api('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /api/projects/:id */
  update: (id, data) =>
    api(`/api/projects/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/projects/:id */
  delete: (id) =>
    api(`/api/projects/${segment(id)}`, { method: 'DELETE' }),


  // ----------------------------------------------------------
  // Service Record (project updates)
  // ----------------------------------------------------------

  /** GET /api/projects/:id/updates?sort=<key> */
  getUpdates: (projectId, sort = '') =>
    api(`/api/projects/${segment(projectId, 'projectId')}/updates${buildQuery([['sort', sort]])}`),

  /** POST /api/projects/:id/updates */
  createUpdate: (projectId, data) =>
    api(`/api/projects/${segment(projectId, 'projectId')}/updates`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /api/projects/updates/:updateId */
  updateUpdate: (updateId, data) =>
    api(`/api/projects/updates/${segment(updateId, 'updateId')}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/projects/updates/:updateId */
  deleteUpdate: (updateId) =>
    api(`/api/projects/updates/${segment(updateId, 'updateId')}`, { method: 'DELETE' }),


  // ----------------------------------------------------------
  // Combined review & update
  // ----------------------------------------------------------

  /** POST /api/projects/:id/review-and-update */
  reviewAndUpdate: (projectId, data) =>
    api(`/api/projects/${segment(projectId, 'projectId')}/review-and-update`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),


  // ----------------------------------------------------------
  // Analytics
  // ----------------------------------------------------------

  /** GET /api/projects/:id/health */
  getHealth: (projectId) =>
    api(`/api/projects/${segment(projectId, 'projectId')}/health`),

  /** GET /api/projects/:id/cost-analytics?months=<n> */
  getCostAnalytics: (projectId, months = 6) =>
    api(`/api/projects/${segment(projectId, 'projectId')}/cost-analytics${buildQuery([['months', months]])}`),


  // ----------------------------------------------------------
  // Bulk helpers
  // ----------------------------------------------------------

  /**
   * Fetch multiple projects by ID in parallel.
   * Safe on empty input. Uses Promise.allSettled so one bad ID
   * doesn't kill the batch.
   *
   * @param {Array<string|number>} ids
   * @returns {Promise<Array>} resolved projects (failures skipped)
   */
  getMany: async (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const results = await Promise.allSettled(
      ids.map((id) => projectService.getOne(id))
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);
  },
};
