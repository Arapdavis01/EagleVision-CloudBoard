// ============================================================
// EAGLEVISION CLOUDBOARD — DOM HELPERS
// ============================================================
// Small, dependency-free utilities for DOM work.
// Import named helpers:
//   import { escapeHtml, debounce, on } from '../utils/dom.js';
// ============================================================


// ============================================================
// SELECTORS
// ============================================================

/**
 * querySelector — scoped to `root` (defaults to document).
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * querySelectorAll as an Array (not NodeList).
 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}


// ============================================================
// SAFETY
// ============================================================

/**
 * Escape a string for safe insertion into HTML.
 * Prevents XSS when interpolating user-controlled values.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape for use inside an HTML attribute value (same as escapeHtml
 * but keeps quotes readable).
 */
export function escapeAttr(str) {
  return escapeHtml(str);
}


// ============================================================
// EVENTS
// ============================================================

/**
 * Add event listener + return a remover.
 *   const off = on(btn, 'click', handler);
 *   off(); // later
 */
export function on(target, type, handler, options) {
  if (!target) return () => {};
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

/**
 * Event delegation.
 *   delegate(document.body, 'click', '.btn-danger', handler);
 */
export function delegate(root, type, selector, handler) {
  if (!root) return () => {};
  const wrapped = (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler.call(target, e, target);
  };
  root.addEventListener(type, wrapped);
  return () => root.removeEventListener(type, wrapped);
}


// ============================================================
// TIMING
// ============================================================

/**
 * Debounce — run at most once per `wait` ms after last call.
 */
export function debounce(fn, wait = 300) {
  let t = null;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttle — run at most once per `wait` ms.
 */
export function throttle(fn, wait = 200) {
  let last = 0;
  let queued = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else if (!queued) {
      queued = setTimeout(() => {
        last = Date.now();
        queued = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * Wait — promise-based delay.
 */
export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


// ============================================================
// CLASS TOGGLES
// ============================================================

export function addClass(el, ...classes) {
  if (!el) return;
  el.classList.add(...classes.filter(Boolean));
}

export function removeClass(el, ...classes) {
  if (!el) return;
  el.classList.remove(...classes.filter(Boolean));
}

export function toggleClass(el, className, force) {
  if (!el) return;
  el.classList.toggle(className, force);
}


// ============================================================
// RENDERING
// ============================================================

/**
 * Set innerHTML with a fade-in animation class.
 */
export function render(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

/**
 * Replace content with a loading skeleton.
 */
export function renderLoading(el, message = 'Loading…') {
  if (!el) return;
  el.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      min-height:40vh;color:#8A94A6;gap:10px;
      font-family:'Inter',system-ui,sans-serif;font-size:14px;
    ">
      <span style="
        width:16px;height:16px;border:2px solid #E2E8F0;border-top-color:#16A34A;
        border-radius:50%;display:inline-block;animation:spin 0.8s linear infinite;
      "></span>
      ${escapeHtml(message)}
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
}

/**
 * Render an empty state.
 */
export function renderEmpty(el, { icon = 'fa-inbox', title = 'Nothing here', text = '' } = {}) {
  if (!el) return;
  el.innerHTML = `
    <div class="empty-state">
      <i class="fas ${escapeHtml(icon)}"></i>
      <p style="font-weight:600;color:#0F172A;margin-bottom:4px;">${escapeHtml(title)}</p>
      ${text ? `<p>${escapeHtml(text)}</p>` : ''}
    </div>
  `;
}


// ============================================================
// MISC
// ============================================================

/**
 * Generate a short unique ID (for DOM element ids, etc).
 */
export function uid(prefix = 'ev') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Scroll an element into view smoothly.
 */
export function scrollToEl(el, offset = 100) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Focus the first focusable element inside a container.
 */
export function focusFirst(container) {
  if (!container) return;
  const el = container.querySelector(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'
  );
  if (el) setTimeout(() => el.focus({ preventScroll: true }), 80);
}


// ============================================================
// NAMED EXPORT — namespaced default
// ============================================================
export const dom = {
  $, $$,
  escapeHtml, escapeAttr,
  on, delegate,
  debounce, throttle, wait,
  addClass, removeClass, toggleClass,
  render, renderLoading, renderEmpty,
  uid, scrollToEl, focusFirst,
};
