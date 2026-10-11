// ============================================================
// EAGLEVISION CLOUDBOARD — COST CHART COMPONENT
// ============================================================
// Line chart for the service record page.
//
// Multiple charts can coexist on the same page — each canvas
// gets its own instance, tracked in a Map keyed by canvas ID.
// (Same pattern as salesChart.js.)
//
// Usage:
//   import {
//     renderCostChart,
//     prepareCostData,
//     destroyCostChart,
//     destroyAllCostCharts,
//   } from './costCharts.js';
//
//   const { labels, values } = prepareCostData(updates);
//   renderCostChart('costChartCanvas', { labels, values });
//
//   // On page unmount:
//   destroyAllCostCharts();
// ============================================================

import { CHART_COLORS, CHART_DEFAULTS } from '../config/constants.js';
import { format }                       from '../utils/format.js';


// ============================================================
// INSTANCE REGISTRY
// ============================================================
const chartInstances = new Map();


// ============================================================
// HELPERS
// ============================================================
function destroyInstance(canvasId) {
  const chart = chartInstances.get(canvasId);
  if (chart) {
    try { chart.destroy(); } catch (_) { /* ignore */ }
    chartInstances.delete(canvasId);
  }
}


// ============================================================
// RENDER
// ============================================================

/**
 * Render a cost line chart on the given canvas.
 *
 * @param {string} canvasId
 * @param {object} data
 * @param {Array<string>} data.labels   X-axis labels
 * @param {Array<number>} data.values   Y-axis values (USD)
 * @param {object} [options]
 * @param {string} [options.label='Cost']    Dataset label
 * @param {string} [options.color]           Override line color
 * @returns {Chart|null}
 */
export function renderCostChart(canvasId, data, options = {}) {
  const {
    label = 'Cost',
    color,
  } = options;

  // ---------- Guard ----------
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    if (import.meta?.env?.DEV) {
      console.warn(`[costChart] Canvas #${canvasId} not found`);
    }
    return null;
  }

  if (!data?.labels?.length || !data?.values?.length) {
    // Clear any previous chart, then bail
    destroyInstance(canvasId);
    return null;
  }

  // ---------- Destroy previous instance on this canvas only ----------
  destroyInstance(canvasId);

  // ---------- Build ----------
  const ctx = canvas.getContext('2d');
  const lineColor = color || CHART_COLORS.primary;

  // Convert hex to rgba for the fill color
  // (or use a light tint that matches the theme)
  const fillColor = 'rgba(22, 163, 74, 0.10)';   // primary-tint equivalent

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label,
        data: data.values.map((v) => Number(v) || 0),
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: lineColor,
        pointBorderColor: CHART_COLORS.surface,
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: (c) => {
              const v = Number(c.raw) || 0;
              return `${label}: ${format.currency(v)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid:  { color: CHART_COLORS.grid, drawBorder: false },
          ticks: {
            color: CHART_COLORS.text,
            callback: (value) => format.compact(value),
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: CHART_COLORS.text,
            font: { family: "'Inter', sans-serif", size: 11 },
          },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}


// ============================================================
// CLEANUP
// ============================================================

/** Destroy the chart on a specific canvas. */
export function destroyCostChart(canvasId) {
  destroyInstance(canvasId);
}

/** Destroy every chart this module has created. */
export function destroyAllCostCharts() {
  chartInstances.forEach((chart) => {
    try { chart.destroy(); } catch (_) { /* ignore */ }
  });
  chartInstances.clear();
}


// ============================================================
// DATA PREP
// ============================================================

/**
 * Group service-record updates by month.
 *
 * @param {Array} updates  [{ created_at, cost }]
 * @returns {{ labels: string[], values: number[] }}
 */
export function prepareCostData(updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { labels: [], values: [] };
  }

  const monthlyCosts = {};

  updates.forEach((update) => {
    const date = new Date(update?.created_at);
    if (Number.isNaN(date.getTime())) return;

    const year  = date.getFullYear();
    const month = date.getMonth() + 1;
    const key   = `${year}-${String(month).padStart(2, '0')}`;

    if (!monthlyCosts[key]) {
      monthlyCosts[key] = { year, month, total: 0 };
    }

    monthlyCosts[key].total += Number(update.cost) || 0;
  });

  const sortedKeys = Object.keys(monthlyCosts).sort();

  // Consistent month labels — independent of the user's locale
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const labels = sortedKeys.map((k) => {
    const { year, month } = monthlyCosts[k];
    return `${MONTH_NAMES[month - 1]} ${year}`;
  });

  const values = sortedKeys.map((k) => monthlyCosts[k].total);

  return { labels, values };
}
