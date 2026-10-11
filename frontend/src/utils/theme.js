// ============================================================
// EAGLEVISION CLOUDBOARD — THEME MANAGER
// ============================================================
// Single source of truth for light/dark mode.
//
//   import { theme } from '../utils/theme.js';
//   theme.get()            // 'light' | 'dark'
//   theme.set('dark')      // applies + persists + emits event
//   theme.toggle()         // flips current
//   theme.init()           // call once at boot (app.js does this)
// ============================================================

import {
  DEFAULT_THEME,
  STORAGE_KEYS,
  FEATURES,
} from '../config/constants.js';
import { storage } from './storage.js';


const BODY_CLASSES = ['theme-light', 'theme-dark'];
const EVENT_NAME   = 'ev:theme-changed';


// ============================================================
// INTERNAL
// ============================================================

function readStoredTheme() {
  const stored = storage.getString(STORAGE_KEYS.THEME, '');
  if (stored === 'light' || stored === 'dark') return stored;
  return DEFAULT_THEME;
}

function applyToDom(theme) {
  document.body.classList.remove(...BODY_CLASSES);
  document.body.classList.add(`theme-${theme}`);

  // Keep browser chrome in sync (mobile status bar)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#FFFFFF');
  }
}

function emit(theme) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { theme } }));
}


// ============================================================
// PUBLIC API
// ============================================================

export const theme = {

  /** Read the current theme (from storage, or default). */
  get() {
    return readStoredTheme();
  },

  /**
   * Set the theme explicitly.
   * Applies to <body>, persists to storage, emits event.
   */
  set(next) {
    const value = next === 'dark' ? 'dark' : 'light';
    applyToDom(value);
    storage.setString(STORAGE_KEYS.THEME, value);
    emit(value);
    return value;
  },

  /** Flip light ↔ dark. */
  toggle() {
    return this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  /**
   * Called once at boot by app.js.
   * Reads storage and applies the class — no event emitted (nothing
   * is listening yet, and emitting would be noise).
   */
  init() {
    const current = readStoredTheme();
    applyToDom(current);
    return current;
  },

  /** Whether the toggle button should even render. */
  isToggleEnabled() {
    return Boolean(FEATURES.themeToggle);
  },

  /** Subscribe to theme changes. Returns an unsubscribe function. */
  onChange(handler) {
    const wrapped = (e) => handler(e.detail.theme);
    window.addEventListener(EVENT_NAME, wrapped);
    return () => window.removeEventListener(EVENT_NAME, wrapped);
  },
};
