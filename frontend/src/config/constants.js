// ============================================================
// EAGLEVISION CLOUDBOARD — GLOBAL CONSTANTS
// ============================================================
// Single source of truth for app-wide values.
//
// Usage:
//   import { API_BASE_URL, ROUTES, AUTH } from '../config/constants.js';
//
// Rules:
//   • NO magic strings anywhere else in the app
//   • NO direct localStorage access — use utils/storage.js
//   • Change a value here → it changes everywhere
// ============================================================


// ============================================================
// 01. API
// ============================================================
export const API_BASE_URL   = 'https://eaglevision-api.onrender.com';
export const API_TIMEOUT_MS = 30000;   // 30s
export const API_WARMUP_MS  = 4000;    // 4s — warm-up ping only


// ============================================================
// 02. APP META
// ============================================================
export const APP_NAME    = 'EagleVision CloudBoard';
export const APP_COMPANY = 'Qoech Technologies';
export const APP_TAGLINE = 'Monitor. Manage. Excel.';
export const APP_VERSION = '1.0.0';


// ============================================================
// 03. STORAGE
// ============================================================
// Every key written to localStorage is prefixed with this.
// Prevents collisions with other apps on the same origin.
// ============================================================
export const STORAGE_PREFIX = 'ev:';

// Current schema version. Bump to force-clear stale sessions.
export const STORAGE_VERSION = 1;

// Storage keys (WITHOUT prefix — storage.js adds it)
export const STORAGE_KEYS = {
  TOKEN:           'token',
  USER:            'user',
  THEME:           'theme',
  VERSION:         'version',
  LAST_ACTIVITY:   'last_activity',
  REMEMBER_EMAIL:  'remember_email',
  REMEMBER_FLAG:   'remember_flag',
};


// ============================================================
// 04. AUTH
// ============================================================
export const AUTH = {
  // Idle timeout — user is auto-logged-out after this long with no activity
  IDLE_TIMEOUT_MS: 1000 * 60 * 30,   // 30 minutes

  // Absolute session limit — even with activity, re-login after this
  SESSION_MAX_MS:  1000 * 60 * 60 * 8,   // 8 hours

  // Roles — extend as needed
  ROLES: {
    ADMIN:  'admin',
    USER:   'user',
    VIEWER: 'viewer',
  },

  // Where to send users after login/logout
  LOGIN_ROUTE:  '#login',
  LOGOUT_ROUTE: '#login',
  HOME_ROUTE:   '#dashboard',
};


// ============================================================
// 05. ROUTES
// ============================================================
// Hash-based routes. Prefix '#' for consistency with location.hash.
// ============================================================
export const ROUTES = {
  LOGIN:            '#login',
  APPROVE_LOGIN:    '#approve-login',
  DASHBOARD:        '#dashboard',
  PROJECTS:         '#projects',
  FINANCE:          '#finance',
  SERVICE_PLANNER:  '#service-planner',
  SERVICE_RECORD:   '#service-record',
  SHOWCASE:         '#showcase',
  ALERTS:           '#alerts',
  CLIENT_REQUESTS:  '#client-requests',
  PUBLIC_STATUS:    '#public-status',
};

// Routes accessible without a token
export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.APPROVE_LOGIN,
];


// ============================================================
// 06. THEME
// ============================================================
export const DEFAULT_THEME = 'light';   // 'light' | 'dark'


// ============================================================
// 07. PAGINATION
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];


// ============================================================
// 08. CHART COLORS — aligned with the light theme in main.css
// ============================================================
export const CHART_COLORS = {
  primary: '#16A34A',                   // Forest green (brand)
  gold:    '#A67C3E',                   // Warm gold (accent)
  cyan:    '#0284C7',                   // Info blue
  warning: '#EA580C',                   // Warning orange
  error:   '#DC2626',                   // Error red
  info:    '#7C3AED',                   // Purple info
  muted:   '#8A94A6',                   // Muted grey
  grid:    'rgba(15, 23, 42, 0.06)',    // Chart gridlines
  text:    '#475569',                   // Chart labels
  surface: '#FFFFFF',                   // Chart background
};

// Multi-series palette
export const CHART_PALETTE = [
  '#16A34A', // green
  '#A67C3E', // gold
  '#0284C7', // blue
  '#7C3AED', // purple
  '#EA580C', // orange
  '#DC2626', // red
  '#0891B2', // teal
  '#65A30D', // lime
];

// Default Chart.js config — spread into any chart
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
        usePointStyle: true,
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
      displayColors: true,
      titleFont: { family: "'Space Grotesk', sans-serif", weight: '600', size: 13 },
      bodyFont:  { family: "'Inter', sans-serif", size: 12 },
    },
  },
  scales: {
    x: {
      grid:  { color: CHART_COLORS.grid, drawBorder: false },
      ticks: { color: CHART_COLORS.text, font: { family: "'Inter', sans-serif", size: 11 } },
    },
    y: {
      grid:  { color: CHART_COLORS.grid, drawBorder: false },
      ticks: { color: CHART_COLORS.text, font: { family: "'Inter', sans-serif", size: 11 } },
    },
  },
};


// ============================================================
// 09. STATUS MAPS
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
  'planned':     { label: 'Planned',     color: '#0284C7' },
  'in-progress': { label: 'In Progress', color: '#7C3AED' },
  'completed':   { label: 'Completed',   color: '#16A34A' },
  'cancelled':   { label: 'Cancelled',   color: '#8A94A6' },
};


// ============================================================
// 10. FORMATTING
// ============================================================
export const CURRENCY = {
  code:   'KES',
  symbol: 'KSh',
  locale: 'en-KE',
};

export const DATE_FORMAT     = 'DD MMM YYYY';
export const DATETIME_FORMAT = 'DD MMM YYYY, HH:mm';
export const TIME_FORMAT     = 'HH:mm';


// ============================================================
// 11. UI TIMING
// ============================================================
export const TOAST_DURATION_MS  = 3500;
export const DEBOUNCE_MS        = 300;
export const MODAL_ANIMATION_MS = 300;


// ============================================================
// 12. FEATURE FLAGS
// ============================================================
export const FEATURES = {
  themeToggle:   false,   // flip to true to enable light/dark switch
  kanbanDrag:    true,
  bulkActions:   true,
  exportPdf:     false,
  publicStatus:  true,
  idleLogout:    true,    // auto-logout on inactivity
  debugConsole:  true,    // expose window.EV in dev mode
};
