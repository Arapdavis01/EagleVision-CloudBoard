// ============================================================
// EAGLEVISION CLOUDBOARD — STORAGE LAYER
// ============================================================
// Single point of contact for all browser storage.
// Nothing else in the app should touch localStorage directly.
//
// Features:
//   • Namespaced keys (ev:*)
//   • JSON auto-parse / stringify
//   • Private-mode safe (all calls wrapped in try/catch)
//   • Schema versioning — auto-clears stale data
//   • Typed auth helpers
// ============================================================

import {
  STORAGE_PREFIX,
  STORAGE_VERSION,
  STORAGE_KEYS,
  AUTH,
} from '../config/constants.js';


// ============================================================
// LOW-LEVEL PRIMITIVES
// ============================================================

/**
 * Build a full key. 'token' -> 'ev:token'
 */
function key(name) {
  return `${STORAGE_PREFIX}${name}`;
}

/**
 * Check if localStorage is usable (private mode blocks it).
 */
function canUseStorage() {
  try {
    const probe = '__ev_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (_) {
    return false;
  }
}

const STORAGE_OK = canUseStorage();

/**
 * Get a raw string value.
 */
function getRaw(name) {
  if (!STORAGE_OK) return null;
  try {
    return localStorage.getItem(key(name));
  } catch (_) {
    return null;
  }
}

/**
 * Set a raw string value.
 */
function setRaw(name, value) {
  if (!STORAGE_OK) return false;
  try {
    localStorage.setItem(key(name), String(value));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Remove a single key.
 */
function removeRaw(name) {
  if (!STORAGE_OK) return;
  try {
    localStorage.removeItem(key(name));
  } catch (_) { /* ignore */ }
}

/**
 * Get all namespaced keys (for debug / clear-all).
 */
function allNamespacedKeys() {
  if (!STORAGE_OK) return [];
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) out.push(k);
    }
  } catch (_) { /* ignore */ }
  return out;
}


// ============================================================
// JSON HELPERS
// ============================================================

export function getJSON(name, fallback = null) {
  const raw = getRaw(name);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

export function setJSON(name, value) {
  try {
    return setRaw(name, JSON.stringify(value));
  } catch (_) {
    return false;
  }
}


// ============================================================
// STRING HELPERS
// ============================================================

export function getString(name, fallback = '') {
  const raw = getRaw(name);
  return raw === null ? fallback : raw;
}

export function setString(name, value) {
  return setRaw(name, value);
}


// ============================================================
// BOOLEAN HELPERS
// ============================================================

export function getBool(name, fallback = false) {
  const raw = getRaw(name);
  if (raw === null) return fallback;
  return raw === 'true';
}

export function setBool(name, value) {
  return setRaw(name, value ? 'true' : 'false');
}


// ============================================================
// REMOVE / CLEAR
// ============================================================

export function remove(name) {
  removeRaw(name);
}

/**
 * Remove all EagleVision keys. Does not touch other apps' data.
 */
export function clearAll() {
  allNamespacedKeys().forEach((k) => {
    try { localStorage.removeItem(k); } catch (_) { /* ignore */ }
  });
}

/**
 * Return a snapshot of all namespaced keys (for debugging).
 */
export function dump() {
  const out = {};
  allNamespacedKeys().forEach((k) => {
    try { out[k] = localStorage.getItem(k); } catch (_) { /* ignore */ }
  });
  return out;
}


// ============================================================
// AUTH HELPERS — typed access to the token + user
// ============================================================

export const auth = {
  getToken() {
    return getString(STORAGE_KEYS.TOKEN, '');
  },

  setToken(token) {
    setString(STORAGE_KEYS.TOKEN, token);
    this.touch();
  },

  clearToken() {
    remove(STORAGE_KEYS.TOKEN);
  },

  getUser() {
    return getJSON(STORAGE_KEYS.USER, null);
  },

  setUser(user) {
    setJSON(STORAGE_KEYS.USER, user);
  },

  clearUser() {
    remove(STORAGE_KEYS.USER);
  },

  isAuthed() {
    return Boolean(this.getToken());
  },

  /**
   * Wipe all auth-related keys — token, user, activity, remember-me.
   */
  clearAll() {
    remove(STORAGE_KEYS.TOKEN);
    remove(STORAGE_KEYS.USER);
    remove(STORAGE_KEYS.LAST_ACTIVITY);
  },

  /**
   * Record current time as last activity.
   */
  touch() {
    setString(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
  },

  /**
   * Get ms since last activity.
   */
  idleMs() {
    const last = getString(STORAGE_KEYS.LAST_ACTIVITY, '');
    if (!last) return 0;
    const lastNum = Number(last);
    if (!Number.isFinite(lastNum)) return 0;
    return Date.now() - lastNum;
  },

  /**
   * True if the user has been idle longer than AUTH.IDLE_TIMEOUT_MS.
   */
  isIdle() {
    if (!AUTH.IDLE_TIMEOUT_MS) return false;
    return this.idleMs() > AUTH.IDLE_TIMEOUT_MS;
  },
};


// ============================================================
// VERSIONING — auto-clear stale schema
// ============================================================

export function ensureVersion() {
  const stored = Number(getString(STORAGE_KEYS.VERSION, '0'));
  if (stored !== STORAGE_VERSION) {
    clearAll();
    setString(STORAGE_KEYS.VERSION, String(STORAGE_VERSION));
  }
}


// ============================================================
// NAMED EXPORT — namespaced default
// ============================================================
export const storage = {
  getString,
  setString,
  getJSON,
  setJSON,
  getBool,
  setBool,
  remove,
  clearAll,
  dump,
  ensureVersion,
  auth,
};
