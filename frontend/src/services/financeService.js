// ============================================================
// EAGLEVISION CLOUDBOARD — FINANCE SERVICE
// ============================================================
// All finance-related API calls (revenue, expenses, net income).
//
// Endpoints covered:
//   GET    /api/finance/revenue
//   POST   /api/finance/revenue
//   PUT    /api/finance/revenue/:id
//   DELETE /api/finance/revenue/:id
//   GET    /api/finance/revenue/summary
//
//   GET    /api/finance/expenses
//   GET    /api/finance/expenses/by-project/:projectId
//   POST   /api/finance/expenses
//   PUT    /api/finance/expenses/:id
//   DELETE /api/finance/expenses/:id
//   GET    /api/finance/expenses/summary
//
//   GET    /api/finance/net-income
// ============================================================

import { api } from './api.js';


// ============================================================
// INTERNAL HELPERS
// ============================================================
function segment(value, label = 'id') {
  if (value === null || value === undefined || value === '') {
    throw new Error(`[financeService] Missing ${label}`);
  }
  return encodeURIComponent(String(value));
}

function ensureObject(data, label = 'data') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`[financeService] ${label} must be an object`);
  }
  return data;
}


// ============================================================
// PUBLIC API
// ============================================================
export const financeService = {

  // ----------------------------------------------------------
  // Revenue (sales)
  // ----------------------------------------------------------

  /** GET /api/finance/revenue */
  getRevenue: () =>
    api('/api/finance/revenue'),

  /** POST /api/finance/revenue */
  createRevenue: (data) =>
    api('/api/finance/revenue', {
      method: 'POST',
      body: JSON.stringify(ensureObject(data)),
    }),

  /** PUT /api/finance/revenue/:id */
  updateRevenue: (id, data) =>
    api(`/api/finance/revenue/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(ensureObject(data)),
    }),

  /** DELETE /api/finance/revenue/:id */
  deleteRevenue: (id) =>
    api(`/api/finance/revenue/${segment(id)}`, { method: 'DELETE' }),

  /** GET /api/finance/revenue/summary */
  getRevenueSummary: () =>
    api('/api/finance/revenue/summary'),


  // ----------------------------------------------------------
  // Expenses
  // ----------------------------------------------------------

  /** GET /api/finance/expenses */
  getExpenses: () =>
    api('/api/finance/expenses'),

  /** GET /api/finance/expenses/by-project/:projectId */
  getExpensesByProject: (projectId) =>
    api(`/api/finance/expenses/by-project/${segment(projectId, 'projectId')}`),

  /** POST /api/finance/expenses */
  createExpense: (data) =>
    api('/api/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(ensureObject(data)),
    }),

  /** PUT /api/finance/expenses/:id */
  updateExpense: (id, data) =>
    api(`/api/finance/expenses/${segment(id)}`, {
      method: 'PUT',
      body: JSON.stringify(ensureObject(data)),
    }),

  /** DELETE /api/finance/expenses/:id */
  deleteExpense: (id) =>
    api(`/api/finance/expenses/${segment(id)}`, { method: 'DELETE' }),

  /** GET /api/finance/expenses/summary */
  getExpenseSummary: () =>
    api('/api/finance/expenses/summary'),


  // ----------------------------------------------------------
  // Net income
  // ----------------------------------------------------------

  /** GET /api/finance/net-income */
  getNetIncome: () =>
    api('/api/finance/net-income'),
};
