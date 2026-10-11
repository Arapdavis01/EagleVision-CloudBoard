// ============================================================
// EAGLEVISION CLOUDBOARD — ALERTS SERVICE
// ============================================================
// All alerts-related API calls.
//
// Endpoints covered:
//   GET  /api/alerts
//   GET  /api/alerts?acknowledged=false
//   POST /api/alerts/:id/acknowledge
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[alertsService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}


// ============================================================
// PUBLIC API
// ============================================================
export const alertsService = {

  /** GET /api/alerts */
  getAll: () =>
    api('/api/alerts'),

  /** GET /api/alerts?acknowledged=false */
  getUnacknowledged: () =>
    api('/api/alerts?acknowledged=false'),

  /** POST /api/alerts/:id/acknowledge */
  acknowledge: (id) =>
    api(`/api/alerts/${segment(id)}/acknowledge`, { method: 'POST' }),
};
