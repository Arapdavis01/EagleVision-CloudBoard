// ============================================================
// EAGLEVISION CLOUDBOARD — PUBLIC STATUS PAGE
// ============================================================
// Public, unauthenticated view of a single project's status.
// Reachable via: #public-status?token=<public_token>
//
// Notes:
//   • Does NOT render the sidebar (public page, no auth)
//   • Reads token from location.hash (not search) — the app
//     uses hash routing
//   • No cleanup needed (no timers, no persistent listeners)
// ============================================================

import { API_BASE_URL, APP_NAME, APP_COMPANY } from '../../config/constants.js';
import { escapeHtml, escapeAttr }               from '../../utils/dom.js';
import { format }                              from '../../utils/format.js';


// ============================================================
// PAGE ENTRY
// ============================================================
export async function publicStatusPage() {
  const app = document.getElementById('app');

  // ---------- Read token from hash ----------
  // Hash format: "#public-status?token=abc123"
  const hashParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const token = hashParams.get('token') || '';

  if (!token) {
    renderInvalidLink(app);
    return;
  }

  // ---------- Loading state ----------
  renderLoading(app);

  // ---------- Fetch status ----------
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/status/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(res.status === 404 ? 'not_found' : 'server_error');
    }

    const data = await res.json();
    renderStatus(app, data);
  } catch (err) {
    if (import.meta?.env?.DEV) {
      console.warn('[public-status] load failed:', err);
    }
    renderError(app, err);
  }
}


// ============================================================
// SHELL — shared wrapper for all states
// ============================================================
function renderShell(innerHTML) {
  return `
    <div class="public-status-shell">
      <div class="public-status-card">
        ${innerHTML}
        <div class="public-status-footer">
          Powered by <strong>${escapeHtml(APP_COMPANY)}</strong> · ${escapeHtml(APP_NAME)}
        </div>
      </div>
    </div>
  `;
}


// ============================================================
// STATES
// ============================================================
function renderLoading(app) {
  app.innerHTML = renderShell(`
    <div class="public-status-body">
      <div class="public-status-loading">
        <span class="spinner" style="border-top-color:var(--primary);"></span>
        <p>Loading project status…</p>
      </div>
    </div>
  `);
}

function renderInvalidLink(app) {
  app.innerHTML = renderShell(`
    <div class="public-status-header">
      <div class="public-status-icon public-status-icon--error">
        <i class="fas fa-link-slash"></i>
      </div>
      <h1>Invalid link</h1>
      <p>No access token was provided. Please use the link you were given.</p>
    </div>
  `);
}

function renderError(app, err) {
  const isNotFound = err?.message === 'not_found';
  const title = isNotFound ? 'Project not found' : 'Something went wrong';
  const text  = isNotFound
    ? 'This project may have been removed or the link has expired.'
    : 'We could not load the project status. Please try again later.';

  app.innerHTML = renderShell(`
    <div class="public-status-header">
      <div class="public-status-icon public-status-icon--error">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <h1>${title}</h1>
      <p>${text}</p>
    </div>
  `);
}

function renderStatus(app, data) {
  const project       = data?.project || {};
  const latestUptime  = data?.latest_uptime || null;

  const statusText  = project.status || 'Unknown';
  const statusClass = String(statusText).toLowerCase().replace(/\s+/g, '-');

  // ---------- Uptime block ----------
  let uptimeHTML = '';
  if (latestUptime) {
    const isUp = Boolean(latestUptime.is_up);
    const responseMs = Number(latestUptime.response_time_ms);

    uptimeHTML = `
      <div class="public-status-uptime public-status-uptime--${isUp ? 'up' : 'down'}">
        <div class="public-status-uptime-icon">
          <i class="fas ${isUp ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        </div>
        <div class="public-status-uptime-info">
          <span class="public-status-uptime-label">
            ${isUp ? 'Online' : 'Offline'}
          </span>
          <span class="public-status-uptime-meta">
            Last checked ${format.dateTime(latestUptime.checked_at)}
            ${Number.isFinite(responseMs) ? ` · ${responseMs} ms` : ''}
          </span>
        </div>
      </div>
    `;
  }

  app.innerHTML = renderShell(`
    <div class="public-status-header">
      <div class="public-status-icon public-status-icon--brand">
        <i class="fas fa-folder-open"></i>
      </div>
      <h1>${escapeHtml(project.name) || 'Untitled Project'}</h1>
      <div class="public-status-badges">
        <span class="status ${escapeAttr(statusClass)}">${escapeHtml(statusText)}</span>
      </div>
    </div>

    <div class="public-status-body">
      <dl class="public-status-details">
        ${project.client ? `
          <div class="public-status-detail">
            <dt><i class="fas fa-user"></i> Client</dt>
            <dd>${escapeHtml(project.client)}</dd>
          </div>
        ` : ''}

        ${project.location ? `
          <div class="public-status-detail">
            <dt><i class="fas fa-map-marker-alt"></i> Location</dt>
            <dd>${escapeHtml(project.location)}</dd>
          </div>
        ` : ''}

        ${project.live_url ? `
          <div class="public-status-detail">
            <dt><i class="fas fa-globe"></i> Live URL</dt>
            <dd>
              <a href="${escapeAttr(project.live_url)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(project.live_url)}
              </a>
            </dd>
          </div>
        ` : ''}
      </dl>

      ${uptimeHTML}
    </div>
  `);
}
