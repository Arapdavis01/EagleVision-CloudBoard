// ============================================================
// EAGLEVISION CLOUDBOARD — SALES CHART COMPONENT
// ============================================================
// Renders a bar chart for monthly revenue or expenses.
//
// Multiple charts can coexist on the same page — each canvas
// gets its own instance, tracked in a Map keyed by canvas ID.
//
// Usage:
//   import { renderSalesChart, destroySalesChart, destroyAllSalesCharts } from './salesChart.js';
//
//   renderSalesChart('revenueChartCanvas', revenueData, {
//     exchangeRate: 129,
//     label: 'Revenue (USD)',
//   });
//
//   // Or destroy a specific one:
//   destroySalesChart('revenueChartCanvas');
//
//   // Or destroy all (typically in a page cleanup):
//   destroyAllSalesCharts();
// ============================================================

import { CHART_COLORS, CHART_DEFAULTS, CURRENCY } from '../config/constants.js';
import { format }                                  from '../utils/format.js';


// ============================================================
// INSTANCE REGISTRY
// ============================================================
// Map<canvasId, Chart>. Lets multiple charts coexist on one page.
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


/**
 * Format a month key like '2026-10' as 'Oct 2026'.
 */
function formatMonthLabel(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return monthKey;
  const [y, m] = monthKey.split('-');
  if (!y || !m) return monthKey;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(m, 10) - 1;
  return `${monthNames[idx] || m} ${y}`;
}


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Render a bar chart on the given canvas.
 *
 * @param {string} canvasId             ID of the <canvas> element
 * @param {Array}  chartData            [{ month: 'YYYY-MM', total: Number }]
 * @param {object} [options]
 * @param {number} [options.exchangeRate=129]  USD → KES multiplier
 * @param {string} [options.label='Revenue (USD)']  Tooltip/dataset label
 * @param {string} [options.type='bar']         'bar' | 'line'
 * @param {string} [options.color]              Override bar color
 * @returns {Chart|null}                The Chart instance, or null
 */
export function renderSalesChart(canvasId, chartData, options = {}) {
  const {
    exchangeRate = 129,
    label = 'Revenue (USD)',
    type = 'bar',
    color,
  } = options;

  // ---------- Guard ----------
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    if (import.meta?.env?.DEV) {
      console.warn(`[salesChart] Canvas #${canvasId} not found`);
    }
    return null;
  }

  if (!Array.isArray(chartData) || chartData.length === 0) {
    // Clear any previous chart, then bail
    destroyInstance(canvasId);
    return null;
  }

  // ---------- Destroy previous instance on this canvas only ----------
  destroyInstance(canvasId);

  // ---------- Build ----------
  const ctx = canvas.getContext('2d');
  const barColor = color || CHART_COLORS.primary;
  const hoverColor = CHART_COLORS.gold;

  const chart = new Chart(ctx, {
    type,
    data: {
      labels: chartData.map((d) => formatMonthLabel(d.month)),
      datasets: [{
        label,
        data: chartData.map((d) => Number(d.total) || 0),
        backgroundColor: barColor,
        hoverBackgroundColor: hoverColor,
        borderRadius: type === 'bar' ? 6 : 0,
        borderSkipped: false,
        tension: type === 'line' ? 0.35 : undefined,
        fill: type === 'line' ? false : undefined,
        borderColor: type === 'line' ? barColor : undefined,
        borderWidth: type === 'line' ? 2 : 0,
        pointBackgroundColor: type === 'line' ? barColor : undefined,
        pointRadius: type === 'line' ? 3 : undefined,
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
              const usd = Number(c.raw) || 0;
              const kes = usd * exchangeRate;
              return `${label}: ${format.currency(usd)} · ${format.currency(kes)}`;
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


/**
 * Destroy the chart associated with a specific canvas.
 */
export function destroySalesChart(canvasId) {
  destroyInstance(canvasId);
}


/**
 * Destroy every chart this module has created.
 * Call from a page's cleanup function.
 */
export function destroyAllSalesCharts() {
  chartInstances.forEach((chart) => {
    try { chart.destroy(); } catch (_) { /* ignore */ }
  });
  chartInstances.clear();
}
