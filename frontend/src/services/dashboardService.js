// ============================================================
// EAGLEVISION CLOUDBOARD — DASHBOARD SERVICE
// ============================================================
// All dashboard-related API calls (KPIs, widgets, preferences).
//
// Endpoints covered:
//   GET  /api/dashboard/kpi
//   GET  /api/dashboard/reviews
//   GET  /api/dashboard/overdue-reviews
//   GET  /api/dashboard/status-distribution
//   GET  /api/dashboard/pending-revenue
//   GET  /api/dashboard/county-breakdown
//   GET  /api/dashboard/for-sale
//   GET  /api/dashboard/projects-summary
//   GET  /api/dashboard/clients-summary
//   GET  /api/dashboard/revenue-summary
//   GET  /api/dashboard/expiring-domains
//   GET  /api/dashboard/preferences
//   PUT  /api/dashboard/preferences
// ============================================================

import { api } from './api.js';


// ============================================================
// PUBLIC API
// ============================================================
export const dashboardService = {

  // ----------------------------------------------------------
  // KPIs
  // ----------------------------------------------------------

  /** GET /api/dashboard/kpi */
  getKPIs: () =>
    api('/api/dashboard/kpi'),


  // ----------------------------------------------------------
  // Reviews
  // ----------------------------------------------------------

  /** GET /api/dashboard/reviews — upcoming reviews */
  getUpcomingReviews: () =>
    api('/api/dashboard/reviews'),

  /** GET /api/dashboard/overdue-reviews */
  getOverdueReviews: () =>
    api('/api/dashboard/overdue-reviews'),


  // ----------------------------------------------------------
  // Charts
  // ----------------------------------------------------------

  /** GET /api/dashboard/status-distribution */
  getStatusDistribution: () =>
    api('/api/dashboard/status-distribution'),


  // ----------------------------------------------------------
  // Money
  // ----------------------------------------------------------

  /** GET /api/dashboard/pending-revenue */
  getPendingRevenue: () =>
    api('/api/dashboard/pending-revenue'),


  // ----------------------------------------------------------
  // Breakdowns
  // ----------------------------------------------------------

  /** GET /api/dashboard/county-breakdown */
  getCountyBreakdown: () =>
    api('/api/dashboard/county-breakdown'),


  // ----------------------------------------------------------
  // For-sale
  // ----------------------------------------------------------

  /** GET /api/dashboard/for-sale */
  getForSaleProjects: () =>
    api('/api/dashboard/for-sale'),


  // ----------------------------------------------------------
  // Summary modals
  // ----------------------------------------------------------

  /** GET /api/dashboard/projects-summary */
  getProjectsSummary: () =>
    api('/api/dashboard/projects-summary'),

  /** GET /api/dashboard/clients-summary */
  getClientsSummary: () =>
    api('/api/dashboard/clients-summary'),

  /** GET /api/dashboard/revenue-summary */
  getRevenueSummary: () =>
    api('/api/dashboard/revenue-summary'),


  // ----------------------------------------------------------
  // Domains
  // ----------------------------------------------------------

  /** GET /api/dashboard/expiring-domains */
  getExpiringDomains: () =>
    api('/api/dashboard/expiring-domains'),


  // ----------------------------------------------------------
  // Preferences
  // ----------------------------------------------------------

  /** GET /api/dashboard/preferences */
  getPreferences: () =>
    api('/api/dashboard/preferences'),

  /**
   * PUT /api/dashboard/preferences
   * @param {object} data  e.g. { exchange_rate: 132 }
   */
  updatePreferences: (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('[dashboardService] updatePreferences expects an object');
    }
    return api('/api/dashboard/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
