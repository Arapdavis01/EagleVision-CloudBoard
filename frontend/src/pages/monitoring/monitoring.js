// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING PAGE
// ============================================================
// Live infrastructure health board.
//
//   • Hydrates from GET /api/monitoring/state on mount
//   • Subscribes to WS for live updates
//   • Shows: status grid, live indicator, recent events
//
// Data flow:
//   mount → fetch state + events → render → connect WS
//   WS status msg → patch one card + prepend event row
//   WS tick msg   → update "live · Ns ago" ticker
//
// Event names:
//   Events store a `target_id` (e.g. "project-4"), not a display
//   name. We resolve the name from `currentState` at render time,
//   falling back to the raw id if the target isn't known.
// ============================================================

import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { api }              from '../../services/api.js';
import { socketService }    from '../../services/socket.js';
import { escapeHtml }       from '../../utils/dom.js';
import { format }           from '../../utils/format.js';
import { registerCleanup }  from '../../utils/pageLifecycle.js';
import { ROUTES }           from '../../config/constants.js';


// ============================================================
// MODULE STATE
// ============================================================
let currentState = {};              // targetId → target object
let lastMessageTs = 0;
let tickTimer = null;
const unsubscribers = [];


// ============================================================
// PAGE ENTRY
// ============================================================
export async function monitoringPage() {
  currentState = {};
  lastMessageTs = 0;

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content monitoring-page">

      <!-- HEADER -->
      <div class="monitoring-header">
        <div class="monitoring-header-left">
          <h2>Monitoring</h2>
          <p class="page-subtitle">Live health of deployed systems</p>
        </div>
        <div class="monitoring-live-indicator" id="live-indicator">
          <span class="live-dot" data-state="connecting"></span>
          <span class="live-label" id="live-label">Connecting…</span>
        </div>
      </div>

      <!-- CARD GRID -->
      <div class="monitoring-grid" id="monitoring-grid">
        <p class="monitoring-empty">Loading targets…</p>
      </div>

      <!-- EVENTS -->
      <div class="monitoring-events-card">
        <div class="dashboard-widget-header">
          <h3 class="dashboard-widget-title">
            <i class="fas fa-list"></i> Recent Events
          </h3>
          <span class="dashboard-widget-count" id="events-count">0</span>
        </div>
        <div id="events-list" class="monitoring-events-list">
          <p class="monitoring-empty">Loading events…</p>
        </div>
      </div>

    </div>
  `;

  initSidebar();
  attachSocketListeners();
  startTickTicker();

  // Initial data load — parallel
  try {
    const [stateRes, eventsRes] = await Promise.all([
      api('/api/monitoring/state'),
      api('/api/monitoring/events?limit=20'),
    ]);

    currentState = stateRes?.targets || {};
    renderGrid(currentState);
    renderEvents(eventsRes?.events || []);
  } catch (err) {
    renderGridError(err);
    console.warn('[monitoring] initial load failed:', err.message);
  }

  // Live updates
  socketService.connect();

  // Cleanup
  registerCleanup(() => {
    for (const off of unsubscribers) {
      try { off(); } catch (_) {}
    }
    unsubscribers.length = 0;
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    socketService.destroy();
  });
}


// ============================================================
// SOCKET LISTENERS
// ============================================================
function attachSocketListeners() {
  // Connection state → live indicator
  unsubscribers.push(socketService.onState((state) => {
    const dot   = document.querySelector('#live-indicator .live-dot');
    const label = document.getElementById('live-label');
    if (!dot || !label) return;

    dot.dataset.state = state;
    if (state === 'open')            label.textContent = 'Live';
    else if (state === 'connecting') label.textContent = 'Connecting…';
    else                             label.textContent = 'Reconnecting…';
  }));

  // Status changes → patch card + prepend event
  unsubscribers.push(socketService.on('status', (msg) => {
    lastMessageTs = msg.ts || Date.now();
    if (!msg.target) return;

    currentState[msg.target.id] = msg.target;   // update name lookup first
    patchCard(msg.target);

    if (msg.before !== null) {                  // real change, not initial snapshot
      prependEvent({
        target_id: msg.target.id,
        from_status: msg.before,
        to_status: msg.after,
        latency_ms: msg.target.latency,
        error: msg.target.error,
        created_at: new Date(msg.ts || Date.now()).toISOString(),
      });
    }
  }));

  // Ticks → update the timestamp ticker
  unsubscribers.push(socketService.on('tick', (msg) => {
    lastMessageTs = msg.ts || Date.now();
  }));
}


// ============================================================
// LIVE TICKER
// ============================================================
function startTickTicker() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    const label = document.getElementById('live-label');
    if (!label || socketService.getState() !== 'open') return;
    if (!lastMessageTs) return;
    const secs = Math.round((Date.now() - lastMessageTs) / 1000);
    label.textContent = secs < 5  ? 'Live'
                     : secs < 60 ? `Live · ${secs}s ago`
                     : `Live · ${Math.floor(secs / 60)}m ago`;
  }, 1000);
}


// ============================================================
// GRID RENDERING
// ============================================================
function renderGrid(targets) {
  const grid = document.getElementById('monitoring-grid');
  if (!grid) return;

  const list = Object.values(targets);
  if (list.length === 0) {
    grid.innerHTML = `<p class="monitoring-empty">No targets configured.</p>`;
    return;
  }

  grid.innerHTML = list.map(renderCard).join('');
}

function renderCard(t) {
  const statusClass = `status-${t.status || 'unknown'}`;
  const statusLabel = (t.status || 'unknown').toUpperCase();
  const latencyText = t.latency != null ? `${t.latency}ms` : '—';
  const icon        = targetIcon(t.id);

  return `
    <div class="monitoring-card ${statusClass}" data-target-id="${escapeHtml(t.id)}">
      <div class="monitoring-card-header">
        <div class="monitoring-card-icon"><i class="fas ${icon}"></i></div>
        <span class="monitoring-card-status">${statusLabel}</span>
      </div>
      <h3 class="monitoring-card-name">${escapeHtml(t.name)}</h3>
      <div class="monitoring-card-meta">
        <span class="monitoring-card-latency">
          <i class="fas fa-bolt"></i> ${latencyText}
        </span>
        ${t.since ? `<span class="monitoring-card-since">since ${format.timeAgo(new Date(t.since).toISOString())}</span>` : ''}
      </div>
      ${t.error ? `<p class="monitoring-card-error" title="${escapeHtml(t.error)}">${escapeHtml(t.error)}</p>` : ''}
    </div>
  `;
}

function patchCard(target) {
  const el = document.querySelector(`.monitoring-card[data-target-id="${CSS.escape(target.id)}"]`);
  if (!el) return;

  // Replace the card wholesale — simpler than diffing class names
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCard(target).trim();
  el.replaceWith(wrapper.firstElementChild);

  // Flash effect
  const fresh = document.querySelector(`.monitoring-card[data-target-id="${CSS.escape(target.id)}"]`);
  if (fresh) {
    fresh.classList.add('monitoring-card--flash');
    setTimeout(() => fresh.classList.remove('monitoring-card--flash'), 800);
  }
}

function renderGridError(err) {
  const grid = document.getElementById('monitoring-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="monitoring-error">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Couldn't load monitoring data.</p>
      <small>${escapeHtml(err?.message || 'Unknown error')}</small>
    </div>
  `;
}

function targetIcon(id) {
  if (id.includes('db') || id.includes('postgres') || id.includes('sql')) return 'fa-database';
  if (id.includes('web') || id.includes('http') || id.includes('api'))   return 'fa-globe';
  return 'fa-server';
}


// ============================================================
// EVENTS RENDERING
// ============================================================
function renderEvents(events) {
  const list = document.getElementById('events-list');
  const countEl = document.getElementById('events-count');
  if (!list) return;

  if (!events || events.length === 0) {
    list.innerHTML = `<p class="monitoring-empty">No events yet.</p>`;
    if (countEl) countEl.textContent = '0';
    return;
  }

  list.innerHTML = events.map(renderEventRow).join('');
  if (countEl) countEl.textContent = String(events.length);
}

function renderEventRow(e) {
  const ts      = new Date(e.created_at);
  const timeStr = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const dateStr = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const arrow   = `<span class="event-arrow">→</span>`;

  // Resolve display name from the live state cache.
  // Events only store the target_id; the human name lives in
  // currentState (populated from /state and WS 'status' messages).
  const target      = currentState[e.target_id];
  const displayName = target?.name || e.target_id;

  return `
    <div class="monitoring-event">
      <div class="monitoring-event-time" title="${escapeHtml(ts.toISOString())}">
        <span class="event-time">${timeStr}</span>
        <span class="event-date">${dateStr}</span>
      </div>
      <div class="monitoring-event-body">
        <strong>${escapeHtml(displayName)}</strong>
        <span class="event-status from-${e.from_status}">${e.from_status}</span>
        ${arrow}
        <span class="event-status to-${e.to_status}">${e.to_status}</span>
        ${e.latency_ms != null ? `<span class="event-meta">${e.latency_ms}ms</span>` : ''}
        ${e.error ? `<span class="event-error" title="${escapeHtml(e.error)}">${escapeHtml(truncate(e.error, 60))}</span>` : ''}
      </div>
    </div>
  `;
}

function prependEvent(e) {
  const list = document.getElementById('events-list');
  const countEl = document.getElementById('events-count');
  if (!list) return;

  // Clear "empty" placeholder if present
  const empty = list.querySelector('.monitoring-empty');
  if (empty) list.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderEventRow(e).trim();
  const node = wrapper.firstElementChild;
  node.classList.add('monitoring-event--new');
  list.prepend(node);

  // Cap at 50 rows in the DOM
  while (list.children.length > 50) {
    list.removeChild(list.lastElementChild);
  }

  if (countEl) countEl.textContent = String(list.children.length);

  // Remove highlight after a moment
  setTimeout(() => node.classList.remove('monitoring-event--new'), 2000);
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
