// ============================================================
// EAGLEVISION CLOUDBOARD — GLOBAL CONSTANTS
// ============================================================
// Single source of truth for app-wide values.
// Import what you need:
//   import { API_BASE_URL, CHART_COLORS } from '../config/constants.js';
// ============================================================


// ============================================================
// API
// ============================================================
export const API_BASE_URL = 'https://eaglevision-api.onrender.com';
export const API_TIMEOUT_MS = 30000; // 30s — abort slow requests


// ============================================================
// APP META
// ============================================================
export const APP_NAME    = 'EagleVision CloudBoard';
export const APP_COMPANY = 'Qoech Technologies';
export const APP_VERSION = '1.0.0';


// ============================================================
// THEME
// ============================================================
// 'light' | 'dark'
// Dark tokens not wired yet — set FEATURES.themeToggle = true to enable.
export const DEFAULT_THEME = 'light';
export const THEME_STORAGE_KEY = 'ev_theme';


// ============================================================
// AUTH
// ============================================================
export const AUTH_TOKEN_KEY = 'ev_token';
export const AUTH_USER_KEY  = 'ev_user';
export const SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 8; // 8 hours


// ============================================================
// PAGINATION
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];


// ============================================================
// CHART COLORS — aligned with light theme (main.css)
// ============================================================
export const CHART_COLORS = {
  primary: '#16A34A',   // Forest green (brand)
  gold:    '#A67C3E',   // Warm gold (accent)
  cyan:    '#0284C7',   // Info blue
  warning: '#EA580C',   // Warning orange
  error:   '#DC2626',   // Error red
  info:    '#7C3AED',   // Purple info
  muted:   '#8A94A6',   // Muted grey
  grid:    'rgba(15, 23, 42, 0.06)',  // Chart gridlines
  text:    '#475569',   // Chart labels
};

// Multi-series palette — pass to Chart.js as backgroundColor
export const CHART_PALETTE = [
  '#16A34A',
  '#A67C3E',
  '#0284C7',
  '#7C3AED',
  '#EA580C',
  '#DC2626',
  '#0891B2',
  '#65A30D',
];

// Default Chart.js options — spread into any chart config
export const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: CHART_COLORS.text,
        font: { family: "'Inter', sans-serif", size: 12 },
        boxWidth: 12,
        boxHeight: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#0F172A',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: "'Space Grotesk', sans-serif", weight: '600', size: 13 },
      bodyFont: { family: "'Inter', sans-serif", size: 12 },
    },
  },
  scales: {
    x: {
      grid: { color: CHART_COLORS.grid, drawBorder: false },
      ticks: { color: CHART_COLORS.text, font: { family: "'Inter', sans-serif", size: 11 } },
    },
    y: {
      grid: { color: CHART_COLORS.grid, drawBorder: false },
      ticks: { color: CHART_COLORS.text, font: { family: "'Inter', sans-serif", size: 11 } },
    },
  },
};


// ============================================================
// STATUS MAPS
// ============================================================
export const PROJECT_STATUS = {
  live:        { label: 'Live',        color: '#16A34A' },
  development: { label: 'Development', color: '#D97706' },
  planning:    { label: 'Planning',    color: '#8A94A6' },
  maintenance: { label: 'Maintenance', color: '#EA580C' },
  archived:    { label: 'Archived',    color: '#6B7280' },
};

export const PRIORITY = {
  high:   { label: 'High',   color: '#DC2626' },
  medium: { label: 'Medium', color: '#EA580C' },
  low:    { label: 'Low',    color: '#0284C7' },
};

export const ALERT_SEVERITY = {
  critical: { label: 'Critical', color: '#DC2626' },
  warning:  { label: 'Warning',  color: '#EA580C' },
  info:     { label: 'Info',     color: '#0284C7' },
};

export const REQUEST_STATUS = {
  pending:   { label: 'Pending',   color: '#D97706' },
  approved:  { label: 'Approved',  color: '#16A34A' },
  rejected:  { label: 'Rejected',  color: '#DC2626' },
  completed: { label: 'Completed', color: '#0284C7' },
};

export const PLAN_STATUS = {
  planned:     { label: 'Planned',     color: '#0284C7' },
  'in-progress': { label: 'In Progress', color: '#7C3AED' },
  completed:   { label: 'Completed',   color: '#16A34A' },
  cancelled:   { label: 'Cancelled',   color: '#8A94A6' },
};


// ============================================================
// CURRENCY & FORMATTING
// ============================================================
export const CURRENCY = {
  code:   'KES',
  symbol: 'KSh',
  locale: 'en-KE',
};

export const DATE_FORMAT     = 'DD MMM YYYY';
export const DATETIME_FORMAT = 'DD MMM YYYY, HH:mm';


// ============================================================
// UI TIMING
// ============================================================
export const TOAST_DURATION_MS   = 3500;
export const DEBOUNCE_MS         = 300;
export const MODAL_ANIMATION_MS  = 300;


// ============================================================
// FEATURE FLAGS
// ============================================================
// Flip a flag to true to enable the feature globally.
// Individual pages can still opt in/out with local overrides.
export const FEATURES = {
  themeToggle:  false,   // enables the light/dark switch button
  kanbanDrag:   true,
  bulkActions:  true,
  exportPdf:    false,
  publicStatus: true,    // shows the public-status page
};


// ============================================================
// ROUTES — single place to update paths
// ============================================================
export const ROUTES = {
  LOGIN:            '/login',
  APPROVE_LOGIN:    '/approve-login',
  DASHBOARD:        '/dashboard',
  PROJECTS:         '/projects',
  FINANCE:          '/finance',
  SERVICE_PLANNER:  '/service-planner',
  SERVICE_RECORD:   '/service-record',
  SHOWCASE:         '/showcase',
  ALERTS:           '/alerts',
  CLIENT_REQUESTS:  '/client-requests',
  PUBLIC_STATUS:    '/public-status',
};
