// ============================================================
// EAGLEVISION CLOUDBOARD — FORMATTING HELPERS
// ============================================================
// All formatting goes through this file. Never format inline.
// ============================================================

import { CURRENCY } from '../config/constants.js';


// ============================================================
// CURRENCY
// ============================================================

/**
 * Format a number as KES currency.
 *   formatCurrency(1500)        → "KSh 1,500"
 *   formatCurrency(1500, {compact:true}) → "KSh 1.5K"
 *   formatCurrency(null)        → "—"
 */
export function formatCurrency(value, opts = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';

  if (opts.compact) {
    return `${CURRENCY.symbol} ${formatCompact(num)}`;
  }

  try {
    const formatted = new Intl.NumberFormat(CURRENCY.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
    return `${CURRENCY.symbol} ${formatted}`;
  } catch (_) {
    return `${CURRENCY.symbol} ${num.toLocaleString()}`;
  }
}

/**
 * Just the number part (no symbol) — useful inside templates.
 */
export function formatNumber(value, opts = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';

  if (opts.compact) return formatCompact(num);

  try {
    return new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: opts.decimals ?? 0,
      maximumFractionDigits: opts.decimals ?? 2,
    }).format(num);
  } catch (_) {
    return String(num);
  }
}

/**
 * 1500 → "1.5K", 1500000 → "1.5M", 1500000000 → "1.5B"
 */
export function formatCompact(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}${abs}`;
}

/**
 * 0.1532 → "15.3%"
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${(num * 100).toFixed(decimals)}%`;
}


// ============================================================
// DATES
// ============================================================

/**
 * Safely turn any input into a Date (or null).
 */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date.
 *   formatDate('2026-10-11')             → "11 Oct 2026"
 *   formatDate('2026-10-11', 'short')    → "11 Oct"
 *   formatDate('2026-10-11', 'long')     → "Sunday, 11 October 2026"
 */
export function formatDate(value, style = 'default') {
  const d = toDate(value);
  if (!d) return '—';

  const opts = {
    short:   { day: '2-digit', month: 'short' },
    default: { day: '2-digit', month: 'short', year: 'numeric' },
    long:    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }[style] || { day: '2-digit', month: 'short', year: 'numeric' };

  try {
    return new Intl.DateTimeFormat('en-KE', opts).format(d);
  } catch (_) {
    return d.toDateString();
  }
}

/**
 * Date + time.
 *   formatDateTime('2026-10-11T14:30:00') → "11 Oct 2026, 14:30"
 */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d);
  } catch (_) {
    return d.toLocaleString();
  }
}

/**
 * Just time.
 *   formatTime('2026-10-11T14:30:00') → "14:30"
 */
export function formatTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-KE', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d);
  } catch (_) {
    return d.toTimeString().slice(0, 5);
  }
}

/**
 * Relative time.
 *   timeAgo(now - 30s)     → "just now"
 *   timeAgo(now - 5min)    → "5 minutes ago"
 *   timeAgo(now - 3days)   → "3 days ago"
 */
export function timeAgo(value) {
  const d = toDate(value);
  if (!d) return '—';

  const diffMs = Date.now() - d.getTime();
  const secs = Math.floor(diffMs / 1000);

  if (secs < 30) return 'just now';
  if (secs < 60) return `${secs} seconds ago`;

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Days between two dates (or now).
 */
export function daysBetween(from, to = new Date()) {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Friendly duration in ms.
 *   formatDuration(1000 * 60 * 90) → "1h 30m"
 */
export function formatDuration(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '—';
  let total = Math.floor(Number(ms) / 1000);
  if (total < 60) return `${total}s`;
  const days = Math.floor(total / 86400); total %= 86400;
  const hours = Math.floor(total / 3600); total %= 3600;
  const mins = Math.floor(total / 60);
  const parts = [];
  if (days)  parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins)  parts.push(`${mins}m`);
  return parts.slice(0, 2).join(' ') || '0m';
}


// ============================================================
// TEXT
// ============================================================

/**
 * Truncate a string.
 *   truncate('Hello world', 8) → "Hello…"
 */
export function truncate(str, max = 60) {
  if (!str) return '';
  const s = String(str);
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Capitalize first letter.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Title-case status labels: 'in_progress' → 'In Progress'
 */
export function humanize(str) {
  if (!str) return '';
  return String(str)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
}

/**
 * Initials from a name.
 *   initials('John Doe') → "JD"
 */
export function initials(name) {
  if (!name) return '?';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}


// ============================================================
// NAMED EXPORT — namespaced default
// ============================================================
export const format = {
  currency:     formatCurrency,
  number:       formatNumber,
  compact:      formatCompact,
  percent:      formatPercent,
  date:         formatDate,
  dateTime:     formatDateTime,
  time:         formatTime,
  timeAgo,
  daysBetween,
  duration:     formatDuration,
  truncate,
  capitalize,
  humanize,
  initials,
};
