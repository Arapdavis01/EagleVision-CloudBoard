// ============================================================
// EAGLEVISION CLOUDBOARD — AUTH SERVICE
// ============================================================
// The ONLY module that talks about tokens and users.
// Uses utils/storage.js internally — no direct localStorage.
//
// Endpoints:
//   POST /api/auth/login
//   POST /api/auth/logout
//   GET  /api/auth/session
//   POST /api/auth/qr/session
//   GET  /api/auth/qr/session/:token/status
//   POST /api/auth/qr/session/:token/approve
// ============================================================

import { api } from './api.js';
import { storage } from '../utils/storage.js';


// ============================================================
// HELPERS
// ============================================================

function devWarn(...args) {
  if (import.meta?.env?.DEV) {
    console.warn('[authService]', ...args);
  }
}

/**
 * Build the local user object from the login response.
 * Currently the backend returns { email }, so we keep it minimal.
 * If the backend later returns a full user object, this picks it up.
 */
function buildUser(data) {
  if (data?.user) return data.user;   // future-proof
  if (data?.email) return { email: data.email };
  return null;
}


// ============================================================
// PUBLIC API
// ============================================================

export const authService = {

  // ----------------------------------------------------------
  // Session lifecycle
  // ----------------------------------------------------------

  /**
   * Email/password login.
   * Persists token + user (minimal) via the storage layer.
   */
  login: async (email, password) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!data?.token) {
      throw new Error('Login failed — server did not return a token.');
    }

    storage.auth.setToken(data.token);

    const user = buildUser(data);
    if (user) {
      storage.auth.setUser(user);
    }

    return data;
  },

  /**
   * Standard logout.
   * Clears local session; does NOT navigate (routing is the router's job).
   */
  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      devWarn('server logout failed — clearing local session only', err);
    } finally {
      storage.auth.clearAll();
    }
  },

  /**
   * Verify the current session with the server.
   * Returns { authenticated: true, email } on success.
   */
  checkSession: () => api('/api/auth/session'),

  // ----------------------------------------------------------
  // Session state (used by router + UI)
  // ----------------------------------------------------------

  isAuthenticated: () => storage.auth.isAuthed(),

  getToken: () => storage.auth.getToken(),

  getCurrentUser: () => storage.auth.getUser(),

  /**
   * Convenience — returns email or null.
   */
  getCurrentEmail: () => {
    const u = storage.auth.getUser();
    return u?.email || null;
  },

  /**
   * Force-clear local session without hitting the server.
   * Useful when a 401 comes back mid-session.
   */
  clearSession: () => storage.auth.clearAll(),

  // ----------------------------------------------------------
  // QR login flow
  // ----------------------------------------------------------

  /** Step 1 — create a new QR session (laptop side) */
  generateLoginSession: () =>
    api('/api/auth/qr/session', { method: 'POST' }),

  /** Step 2 — poll session status (laptop side) */
  checkLoginSessionStatus: (sessionToken) =>
    api(`/api/auth/qr/session/${encodeURIComponent(sessionToken)}/status`),

  /** Step 3 — approve from phone (PIN only, no auth) */
  approveLoginSession: (sessionToken, pin) =>
    api(`/api/auth/qr/session/${encodeURIComponent(sessionToken)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
};
