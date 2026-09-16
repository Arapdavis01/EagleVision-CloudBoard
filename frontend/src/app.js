import { initRouter } from './router.js';
import { API_BASE_URL } from './config/constants.js';

// ==================== BACKEND WARM-UP ====================
// Fire-and-forget ping to wake up the backend (Render cold start).
// Runs immediately on app load so the server is warm by the time
// the user finishes typing their credentials.
fetch(`${API_BASE_URL}/health`).catch(() => {
  // Silent failure — this is just a warm-up, not critical
});

// ==================== START ROUTER ====================
initRouter();
