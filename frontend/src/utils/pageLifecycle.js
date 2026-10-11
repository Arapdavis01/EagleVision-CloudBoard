// ============================================================
// PAGE LIFECYCLE — cleanup registry
// ============================================================
// Pages register cleanup functions (intervals, listeners,
// charts) that should run before the next page loads.
//
// Usage in a page module:
//
//   import { registerCleanup } from '../../utils/pageLifecycle.js';
//
//   export async function myPage() {
//     const timer = setInterval(...);
//     const chart = new Chart(...);
//     registerCleanup(() => {
//       clearInterval(timer);
//       chart.destroy();
//     });
//   }
//
// The router calls runCleanups() before loading the next page.
// ============================================================

const cleanups = new Set();

export function registerCleanup(fn) {
  if (typeof fn === 'function') cleanups.add(fn);
}

export function runCleanups() {
  cleanups.forEach((fn) => {
    try { fn(); } catch (err) {
      if (import.meta?.env?.DEV) console.warn('[lifecycle] cleanup failed:', err);
    }
  });
  cleanups.clear();
}
