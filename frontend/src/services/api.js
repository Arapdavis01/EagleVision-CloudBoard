// ============================================================
// EAGLEVISION CLOUDBOARD — API CLIENT
// ============================================================
// Base wrapper for all HTTP requests.
//
// Features:
//   • Auto-attaches Bearer token from storage
//   • Request timeout with AbortController
//   • Normalized error messages
//   • Emits 'ev:session-expired' on 401 (router handles redirect)
//   • Dev logging
//
// Usage:
//   import { api } from '../services/api.js';
//   const data = await api('/api/projects', { method: 'GET' });
//   const created = await api('/api/projects', {
//     method: 'POST',
//     body: JSON.stringify({ name: 'New project' }),
//   });
// ============================================================

import { API_BASE_URL, API_TIMEOUT_MS, ROUTES } from '../config/constants.js';
import { storage } from '../utils/storage.js';


// ============================================================
// TIMEOUTS
// ============================================================
// Login allows extra time for Render cold starts.
// ============================================================
const DEFAULT_TIMEOUT = API_TIMEOUT_MS;         // 30s
const LOGIN_TIMEOUT   = 60 * 1000;              // 60s — cold start buffer

const LOGIN_ENDPOINT_MARKER = '/auth/login';


// ============================================================
// HELPERS
// ============================================================

function isDev() {
  return Boolean(import.meta?.env?.DEV);
}

function logDev(...args) {
  if (isDev()) console.log('[api]', ...args);
}

function warnDev(...args) {
  if (isDev()) console.warn('[api]', ...args);
}

/**
 * Emit a global event so the router can react to a session expiry.
 */
function emitSessionExpired() {
  try {
    window.dispatchEvent(new CustomEvent('ev:session-expired'));
  } catch (_) { /* ignore */ }
}

/**
 * Pick the right timeout for the endpoint.
 */
function resolveTimeout(endpoint, options) {
  if (options?.timeout) return options.timeout;
  if (endpoint.includes(LOGIN_ENDPOINT_MARKER)) return LOGIN_TIMEOUT;
  return DEFAULT_TIMEOUT;
}

/**
 * Extract a user-friendly error message from a response body.
 */
function extractErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`;
  if (typeof data === 'string') return data;
  return (
    data.message ||
    data.error ||
    data.detail ||
    `Request failed (${status})`
  );
}


// ============================================================
// CORE API
// ============================================================

/**
 * Make an API request.
 *
 * @param {string} endpoint  Path like '/api/projects'
 * @param {object} options   Fetch options (method, body, headers, timeout)
 * @returns {Promise<any>}   Parsed JSON (or null for 204)
 */
export async function api(endpoint, options = {}) {
  // ---------- Auth header ----------
  const token = storage.auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ---------- Timeout ----------
  const timeout = resolveTimeout(endpoint, options);
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeout);

  // ---------- Config ----------
  const config = {
    credentials: 'include',       // keep — harmless, useful if you ever use cookies
    headers,
    signal: controller.signal,
    ...options,
  };
  delete config.timeout;          // custom field, not valid for fetch

  const url = `${API_BASE_URL}${endpoint}`;
  logDev(`${config.method || 'GET'} ${endpoint}`);

  // ---------- Request ----------
  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // ----- 401 Unauthorized -----
    if (response.status === 401) {
      // Don't redirect if we're already on the login page
      const onLoginPage = window.location.hash.startsWith(ROUTES.LOGIN);

      if (!onLoginPage) {
        storage.auth.clearAll();
        emitSessionExpired();
        throw new Error('Session expired. Please sign in again.');
      }
      // If we're on login, let the login flow surface the error
      const data = await response.json().catch(() => null);
      throw new Error(extractErrorMessage(data, 401));
    }

    // ----- 204 No Content -----
    if (response.status === 204) {
      return null;
    }

    // ----- Other non-OK -----
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(extractErrorMessage(data, response.status));
    }

    // ----- Success -----
    // Guard against empty bodies on 200/201
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      warnDev('Response was not JSON:', text.slice(0, 120));
      return text;
    }

  } catch (err) {
    clearTimeout(timeoutId);

    // ----- Timeout -----
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    // ----- Network error -----
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      throw new Error('Cannot reach server. Please check your connection.');
    }

    // ----- Anything else -----
    throw err;
  }
}


// ============================================================
// CONVENIENCE SHORTCUTS
// ============================================================
// Optional — lets you write `api.get('/api/projects')` instead of
// `api('/api/projects', { method: 'GET' })`.
// Safe to add without breaking existing callers.
// ============================================================

api.get = (endpoint, options = {}) =>
  api(endpoint, { ...options, method: 'GET' });

api.post = (endpoint, body, options = {}) =>
  api(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

api.put = (endpoint, body, options = {}) =>
  api(endpoint, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

api.patch = (endpoint, body, options = {}) =>
  api(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

api.delete = (endpoint, options = {}) =>
  api(endpoint, { ...options, method: 'DELETE' });


// ============================================================
// NAMED EXPORT
// ============================================================
export default api;
