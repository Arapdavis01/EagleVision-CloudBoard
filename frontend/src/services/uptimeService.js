// ============================================================
// EAGLEVISION CLOUDBOARD — UPTIME SERVICE
// ============================================================
// Uptime checks + alert resolution.
//
// IMPORTANT: `getAlerts()` returns the same data as
// `alertsService.getAll()`. They currently point at the same
// backend endpoint (`/api/alerts`). Kept separate for now so
// the pages don't have to change — consolidate later if the
// backend splits them into two resources.
//
// Endpoints covered:
//   GET  /api/alerts
//   POST /api/alerts/:id/resolve
//   GET  /api/uptime/logs?project_id=…&limit=…&offset=…
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[uptimeService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}

function buildQuery(pairs) {
  const parts = pairs
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}


// ============================================================
// PUBLIC API
// ============================================================
export const uptimeService = {

  /**
   * GET /api/alerts
   * @deprecated Prefer `alertsService.getAll()` — this exists for
   *             historical reasons and points at the same endpoint.
   */
  getAlerts: () =>
    api('/api/alerts'),

  /** POST /api/alerts/:id/resolve */
  resolveAlert: (projectId) =>
    api(`/api/alerts/${segment(projectId, 'projectId')}/resolve`, { method: 'POST' }),

  /**
   * GET /api/uptime/logs?project_id=…&limit=…&offset=…
   * @param {string|number} projectId
   * @param {object}        [options]
   * @param {number}        [options.limit=50]
   * @param {number}        [options.offset=0]
   */
  getLogs: (projectId, { limit = 50, offset = 0 } = {}) =>
    api(`/api/uptime/logs${buildQuery([
      ['project_id', projectId],
      ['limit', limit],
      ['offset', offset],
    ])}`),
};
