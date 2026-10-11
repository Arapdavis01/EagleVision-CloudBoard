// ============================================================
// EAGLEVISION CLOUDBOARD — SALES SERVICE
// ============================================================
// All sales-related API calls. Wraps the `api()` client for
// consistent error handling + auth headers.
//
// Endpoints covered:
//   GET    /api/sales
//   GET    /api/sales/:id
//   POST   /api/sales
//   PUT    /api/sales/:id
//   DELETE /api/sales/:id
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================

function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[salesService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}


// ============================================================
// PUBLIC API
// ============================================================
export const salesService = {

  /** GET /api/sales */
  getAll: () =>
    api('/api/sales'),

  /** GET /api/sales/:id */
  getOne: (id) =>
    api(`/api/sales/${segment(id)}`),

  /** POST /api/sales */
  create: (data) =>
    api('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PUT /api/sales/:id */
  update: (id, data) =>
    api(`/api/sales/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/sales/:id */
  delete: (id) =>
    api(`/api/sales/${segment(id)}`, { method: 'DELETE' }),
};
