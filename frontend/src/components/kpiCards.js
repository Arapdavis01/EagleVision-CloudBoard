// ============================================================
// EAGLEVISION CLOUDBOARD — KPI CARDS
// ============================================================
// Renders KPI stat cards for the dashboard.
//
// Usage:
//   import { renderKPIs, renderKPIPlaceholders } from '../components/kpiCards.js';
//
//   // Inside a `.kpi-grid` container:
//   container.innerHTML = renderKPIs(data);
//   container.innerHTML = renderKPIPlaceholders(); // while loading
// ============================================================

import { format } from '../utils/format.js';


// ============================================================
// KPI CARD DEFINITIONS
// ============================================================
// Declarative — to add a new KPI, just add an entry.
//
//   key:      which field on `data` to read
//   label:    display label
//   icon:     Font Awesome class
//   format:   'number' | 'currency'
//   modifier: optional class on the value (e.g., for coloring)
// ============================================================
const KPI_DEFS = [
  {
    key:    'total_projects',
    label:  'Total Projects',
    icon:   'fa-folder-open',
    format: 'number',
  },
  {
    key:    'live_projects',
    label:  'Live Projects',
    icon:   'fa-rocket',
    format: 'number',
  },
  {
    key:    'active_clients',
    label:  'Active Clients',
    icon:   'fa-users',
    format: 'number',
  },
  {
    key:    'total_revenue',
    label:  'Total Revenue',
    icon:   'fa-dollar-sign',
    format: 'currency',
  },
];


// ============================================================
// RENDERERS
// ============================================================

/**
 * Render the KPI cards (no wrapper — caller owns the .kpi-grid).
 * @param {object} data  Object with fields matching KPI_DEFS[].key
 * @returns {string} HTML
 */
export function renderKPIs(data = {}) {
  return KPI_DEFS
    .map((def) => renderSingleKPI(def, data))
    .join('');
}


/**
 * Render placeholders (em-dashes) while loading.
 * Same visual layout — no layout shift when data arrives.
 */
export function renderKPIPlaceholders() {
  return KPI_DEFS
    .map((def) => `
      <div class="card kpi-card compact-kpi">
        <i class="fas ${def.icon} kpi-icon"></i>
        <h3>${def.label}</h3>
        <div class="value kpi-placeholder">—</div>
      </div>
    `)
    .join('');
}


// ============================================================
// INTERNAL
// ============================================================

function renderSingleKPI(def, data) {
  const raw = data?.[def.key];
  const value = formatValue(raw, def.format);
  const isEmpty = raw === null || raw === undefined;

  return `
    <div class="card kpi-card compact-kpi" data-kpi="${def.key}">
      <i class="fas ${def.icon} kpi-icon"></i>
      <h3>${def.label}</h3>
      <div class="value${isEmpty ? ' kpi-placeholder' : ''}">${value}</div>
    </div>
  `;
}

function formatValue(raw, formatType) {
  // Nullish → em-dash
  if (raw === null || raw === undefined || raw === '') return '—';

  switch (formatType) {
    case 'currency':
      return format.currency(raw);

    case 'number':
    default:
      return format.number(raw);
  }
}
