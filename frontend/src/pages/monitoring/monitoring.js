// ============================================================
// EAGLEVISION CLOUDBOARD — MONITORING PAGE
// ============================================================
// Professional monitoring dashboard. Summary-first layout:
//
//   ┌─ Header (title · live indicator · refresh button)
//   ├─ Health banner ("All systems operational" / "2 degraded")
//   ├─ Summary tiles (Total / Up / Degraded / Down) — click to filter
//   ├─ [optional] Search + Sort toolbar
//   ├─ [optional] Filtered target grid
//   └─ Recent Activity (events with duration on recovery)
//
// Scannable in 2 seconds. Scales from 10 to 1000 targets — the
// summary stays the same size; the grid only appears when asked.
//
// Data flow:
//   mount → GET /state + /events → render summary + incidents
//   WS 'status' → update tiles + banner + patch card if visible
//   WS 'tick'   → update "Live · Ns ago" indicator
//   ⟳ button    → POST /refresh → backend forces probe + broadcasts
// ============================================================

import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { api }              from '../../services/api.js';
import { socketService }    from '../../services/socket.js';
import { escapeHtml }       from '../../utils/dom.js';
import { format }           from '../../utils/format.js';
import { registerCleanup }  from '../../utils/pageLifecycle.js';
import { showToast }        from '../../utils/notifications.js';
import { ROUTES }           from '../../config/constants.js';


// ============================================================
// CONFIG
// ============================================================
// When the total number of targets is <= AUTO_SHOW_GRID_MAX, the
// grid appears by default. Above this threshold, it starts hidden
// so a 100-target account doesn't render 100 cards on load.
const AUTO_SHOW_GRID_MAX = 20;


// ============================================================
// MODULE STATE
// ============================================================
let currentState = {};              // targetId → target object
let currentEvents = [];             // most recent events from API
let lastMessageTs = 0;
let tickTimer = null;
let activeFilter = null;            // null | 'up' | 'degraded' | 'down'
let sortMode = 'status';            // 'status' | 'name' | 'latency' | 'changed'
let searchTerm = '';
const unsubscribers = [];


// ============================================================
// PAGE ENTRY
// ============================================================
export async function monitoringPage() {
  currentState = {};
  currentEvents = [];
  lastMessageTs = 0;
  activeFilter = null;
  sortMode = 'status';
  searchTerm = '';

  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="main-content monitoring-page">

      <!-- HEADER -->
      <div class="monitoring-header">
        <div class="monitoring-header-left">
          <h2>Monitoring</h2>
          <p class="page-subtitle">Live health of all deployed systems</p>
        </div>
        <div class="monitoring-header-right">
          <button
            type="button"
            id="refresh-btn"
            class="monitoring-refresh-btn"
            title="Force an immediate probe of every target"
            aria-label="Refresh now">
            <i class="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </button>
          <div class="monitoring-live-indicator" id="live-indicator">
            <span class="live-dot" data-state="connecting"></span>
            <span class="live-label" id="live-label">Connecting…</span>
          </div>
        </div>
      </div>

      <!-- HEALTH BANNER -->
      <div class="monitoring-banner" id="health-banner" data-state="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span id="banner-text">Loading health status…</span>
      </div>

      <!-- SUMMARY TILES -->
      <div class="monitoring-summary" id="summary-tiles">
        ${renderTilePlaceholders()}
      </div>

      <!-- TOOLBAR (search + sort) — hidden until grid is shown -->
      <div class="monitoring-toolbar hidden" id="toolbar">
        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input
            type="text"
            id="search-input"
            placeholder="Search by name or client…"
            autocomplete="off"
          />
        </div>
        <select id="sort-select" class="filter-select">
          <option value="status">Sort: Status (worst first)</option>
          <option value="name">Sort: Name (A → Z)</option>
          <option value="latency">Sort: Latency (slowest first)</option>
          <option value="changed">Sort: Recently changed</option>
        </select>
        <button
          type="button"
          id="clear-filters-btn"
          class="btn btn-ghost btn-sm hidden"
          title="Clear search and filters">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <!-- TARGET GRID — filtered, hidden until user clicks a tile -->
      <div class="monitoring-grid hidden" id="monitoring-grid">
        <p class="monitoring-empty">Loading targets…</p>
      </div>

      <!-- RECENT ACTIVITY -->
      <div class="monitoring-events-card">
        <div class="dashboard-widget-header">
          <h3 class="dashboard-widget-title">
            <i class="fas fa-history"></i> Recent Activity
          </h3>
          <span class="dashboard-widget-count" id="events-count">0</span>
        </div>
        <div id="events-list" class="monitoring-events-list">
          <p class="monitoring-empty">Loading activity…</p>
        </div>
      </div>

    </div>
  `;

  initSidebar();
  attachSocketListeners();
  attachUIListeners();
  startTickTicker();

  // Initial data load — parallel
  try {
    const [stateRes, eventsRes] = await Promise.all([
      api('/api/monitoring/state'),
      api('/api/monitoring/events?limit=30'),
    ]);

    currentState = stateRes?.targets || {};
    currentEvents = eventsRes?.events || [];

    renderSummary();
    renderBanner();
    renderEvents(currentEvents);

    // Show the grid by default only for small accounts
    if (Object.keys(currentState).length <= AUTO_SHOW_GRID_MAX) {
      showGrid();
    }
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
// UI LISTENERS
// ============================================================
function attachUIListeners() {
  // Refresh button
  document.getElementById('refresh-btn')?.addEventListener('click', onRefreshClick);

  // Tile clicks (delegated — tiles re-render on state change)
  document.getElementById('summary-tiles')?.addEventListener('click', (e) => {
    const tile = e.target.closest('[data-filter]');
    if (!tile) return;
    const filter = tile.dataset.filter;    // 'all' | 'up' | 'degraded' | 'down'
    if (filter === 'all') {
      activeFilter = null;
    } else {
      activeFilter = (activeFilter === filter) ? null : filter;
    }
    renderSummary();
    showGrid();
  });

  // Search
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    renderGrid();
    updateClearButton();
  });

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    sortMode = e.target.value;
    renderGrid();
  });

  // Clear
  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    searchTerm = '';
    activeFilter = null;
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderSummary();
    renderGrid();
    updateClearButton();
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

  // Status changes → update tiles, banner, card, and activity feed
  unsubscribers.push(socketService.on('status', (msg) => {
    lastMessageTs = msg.ts || Date.now();
    if (!msg.target) return;

    const prevStatus = currentState[msg.target.id]?.status;
    currentState[msg.target.id] = msg.target;

    // Update summary — cheap, just re-renders 4 tiles
    renderSummary();
    renderBanner();

    // Patch the card if it's visible
    if (!document.getElementById('monitoring-grid')?.classList.contains('hidden')) {
      patchCard(msg.target, prevStatus);
    }

    // Prepend to activity feed
    if (msg.before !== null) {
      const event = {
        target_id: msg.target.id,
        from_status: msg.before,
        to_status: msg.after,
        latency_ms: msg.target.latency,
        error: msg.target.error,
        created_at: new Date(msg.ts || Date.now()).toISOString(),
      };
      currentEvents.unshift(event);
      if (currentEvents.length > 100) currentEvents.length = 100;
      prependEvent(event);
    }
  }));

  // Ticks → update the timestamp ticker
  unsubscribers.push(socketService.on('tick', (msg) => {
    lastMessageTs = msg.ts || Date.now();
  }));
}


// ============================================================
// REFRESH BUTTON
// ============================================================
async function onRefreshClick() {
  const btn = document.getElementById('refresh-btn');
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.classList.add('is-loading');

  try {
    const res = await api('/api/monitoring/refresh', { method: 'POST' });

    // Fetch fresh state — WS will also update, but this is instant
    const stateRes = await api('/api/monitoring/state');
    currentState = stateRes?.targets || {};
    renderSummary();
    renderBanner();
    if (!document.getElementById('monitoring-grid')?.classList.contains('hidden')) {
      renderGrid();
    }

    const up = res?.up ?? 0;
    const deg = res?.degraded ?? 0;
    showToast(`Refreshed ${res?.total ?? 0} targets — ${up} up, ${deg} degraded`, 'success');
  } catch (err) {
    showToast(err.message || 'Refresh failed', 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-loading');
  }
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

  // Also refresh "since" timestamps on cards every second
  setInterval(() => {
    document.querySelectorAll('.monitoring-card-since[data-since]').forEach((el) => {
      const since = parseInt(el.dataset.since, 10);
      if (!since) return;
      el.textContent = `since ${format.timeAgo(new Date(since).toISOString())}`;
    });
  }, 1000);
}


// ============================================================
// SUMMARY TILES
// ============================================================
function renderTilePlaceholders() {
  const tile = (label) => `
    <div class="monitoring-tile" data-filter="all" data-status="${label.toLowerCase()}">
      <div class="monitoring-tile-label">
        <span class="tile-dot"></span>
        <span>${label}</span>
      </div>
      <div class="monitoring-tile-value">—</div>
    </div>
  `;
  return tile('Total') + tile('Up') + tile('Degraded') + tile('Down');
}

function renderSummary() {
  const wrap = document.getElementById('summary-tiles');
  if (!wrap) return;

  const all = Object.values(currentState);
  const counts = {
    total:    all.length,
    up:       all.filter((t) => t.status === 'up').length,
    degraded: all.filter((t) => t.status === 'degraded').length,
    down:     all.filter((t) => t.status === 'down').length,
  };

  const pct = (n) => counts.total > 0 ? Math.round((n / counts.total) * 100) : 0;

  wrap.innerHTML = `
    ${renderTile('Total',    'all',      counts.total,    100,              activeFilter === null)}
    ${renderTile('Up',       'up',       counts.up,       pct(counts.up),   activeFilter === 'up')}
    ${renderTile('Degraded', 'degraded', counts.degraded, pct(counts.degraded), activeFilter === 'degraded')}
    ${renderTile('Down',     'down',     counts.down,     pct(counts.down), activeFilter === 'down')}
  `;
}

function renderTile(label, filter, value, pct, active) {
  const statusClass = filter === 'all' ? 'tile-total' : `tile-${filter}`;
  const dimmed = value === 0 && filter !== 'all' ? ' is-zero' : '';
  const activeClass = active ? ' is-active' : '';

  return `
    <div
      class="monitoring-tile ${statusClass}${activeClass}${dimmed}"
      data-filter="${filter}"
      role="button"
      tabindex="0"
      aria-pressed="${active}">
      <div class="monitoring-tile-label">
        <span class="tile-dot"></span>
        <span>${label}</span>
      </div>
      <div class="monitoring-tile-value">${value}</div>
      <div class="monitoring-tile-pct">${pct}%</div>
    </div>
  `;
}


// ============================================================
// HEALTH BANNER
// ============================================================
function renderBanner() {
  const banner = document.getElementById('health-banner');
  const text   = document.getElementById('banner-text');
  if (!banner || !text) return;

  const all = Object.values(currentState);
  const total    = all.length;
  const down     = all.filter((t) => t.status === 'down').length;
  const degraded = all.filter((t) => t.status === 'degraded').length;

  let state, icon, message;

  if (total === 0) {
    state = 'loading';
    icon = 'fa-spinner fa-spin';
    message = 'Loading health status…';
  } else if (down > 0 && degraded > 0) {
    state = 'down';
    icon = 'fa-times-circle';
    message = `${down} system${down !== 1 ? 's' : ''} down, ${degraded} degraded`;
  } else if (down > 0) {
    state = 'down';
    icon = 'fa-times-circle';
    message = `${down} system${down !== 1 ? 's' : ''} down`;
  } else if (degraded > 0) {
    state = 'degraded';
    icon = 'fa-exclamation-triangle';
    message = `${degraded} system${degraded !== 1 ? 's' : ''} degraded`;
  } else {
    state = 'up';
    icon = 'fa-check-circle';
    message = 'All systems operational';
  }

  banner.dataset.state = state;
  banner.innerHTML = `<i class="fas ${icon}"></i> <span id="banner-text">${message}</span>`;
}


// ============================================================
// GRID — filtering, sorting, rendering
// ============================================================
function showGrid() {
  const grid    = document.getElementById('monitoring-grid');
  const toolbar = document.getElementById('toolbar');
  if (!grid) return;

  grid.classList.remove('hidden');
  toolbar?.classList.remove('hidden');
  renderGrid();
  updateClearButton();
}

function renderGrid() {
  const grid = document.getElementById('monitoring-grid');
  if (!grid) return;

  let list = Object.values(currentState);

  // Filter by status
  if (activeFilter) {
    list = list.filter((t) => t.status === activeFilter);
  }

  // Filter by search term
  if (searchTerm) {
    list = list.filter((t) =>
      (t.name || '').toLowerCase().includes(searchTerm) ||
      (t.client || '').toLowerCase().includes(searchTerm)
    );
  }

  // Sort
  list.sort(getSortFn(sortMode));

  if (list.length === 0) {
    grid.innerHTML = `<p class="monitoring-empty">No targets match the current filter.</p>`;
    return;
  }

  grid.innerHTML = list.map(renderCard).join('');
}

function getSortFn(mode) {
  const statusRank = { down: 0, degraded: 1, unknown: 2, up: 3 };
  switch (mode) {
    case 'name':
      return (a, b) => (a.name || '').localeCompare(b.name || '');
    case 'latency':
      return (a, b) => (b.latency ?? -1) - (a.latency ?? -1);
    case 'changed':
      return (a, b) => (b.since ?? 0) - (a.since ?? 0);
    case 'status':
    default:
      return (a, b) => {
        const ra = statusRank[a.status] ?? 9;
        const rb = statusRank[b.status] ?? 9;
        if (ra !== rb) return ra - rb;
        return (a.name || '').localeCompare(b.name || '');
      };
  }
}

function updateClearButton() {
  const btn = document.getElementById('clear-filters-btn');
  if (!btn) return;
  const show = Boolean(searchTerm || activeFilter);
  btn.classList.toggle('hidden', !show);
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
        ${t.since ? `<span class="monitoring-card-since" data-since="${t.since}">since ${format.timeAgo(new Date(t.since).toISOString())}</span>` : ''}
      </div>
      ${t.error ? `<p class="monitoring-card-error" title="${escapeHtml(t.error)}">${escapeHtml(t.error)}</p>` : ''}
    </div>
  `;
}

function patchCard(target, prevStatus) {
  const el = document.querySelector(`.monitoring-card[data-target-id="${CSS.escape(target.id)}"]`);
  if (!el) return;

  // Replace the card wholesale — simpler than diffing class names
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCard(target).trim();
  el.replaceWith(wrapper.firstElementChild);

  // Flash ONLY when the status actually changed — not on latency-only updates
  if (prevStatus !== undefined && prevStatus !== target.status) {
    const fresh = document.querySelector(`.monitoring-card[data-target-id="${CSS.escape(target.id)}"]`);
    if (fresh) {
      fresh.classList.add('monitoring-card--flash');
      setTimeout(() => fresh.classList.remove('monitoring-card--flash'), 800);
    }
  }
}

function renderGridError(err) {
  const grid = document.getElementById('monitoring-grid');
  if (!grid) return;
  grid.classList.remove('hidden');
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
// RECENT ACTIVITY (events with duration on recovery)
// ============================================================
function renderEvents(events) {
  const list = document.getElementById('events-list');
  const countEl = document.getElementById('events-count');
  if (!list) return;

  if (!events || events.length === 0) {
    list.innerHTML = `<p class="monitoring-empty">No activity yet.</p>`;
    if (countEl) countEl.textContent = '0';
    return;
  }

  list.innerHTML = events.map(renderEventRow).join('');
  if (countEl) countEl.textContent = String(events.length);
}

/**
 * Render one activity row. If the event marks a recovery
 * (to_status === 'up' AND from_status !== 'unknown'),
 * compute and show how long the incident lasted by finding the
 * nearest previous event for the same target.
 */
function renderEventRow(e) {
  const ts      = new Date(e.created_at);
  const timeStr = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const dateStr = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const arrow   = `<span class="event-arrow">→</span>`;

  // Resolve display name from the live state cache
  const target      = currentState[e.target_id];
  const displayName = target?.name || e.target_id;

  // Compute duration if this is a recovery
  const duration = computeDuration(e);

  return `
    <div class="monitoring-event" data-target-id="${escapeHtml(e.target_id)}">
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
        ${duration ? `<span class="event-duration"><i class="fas fa-clock"></i> ${duration}</span>` : ''}
        ${e.error ? `<span class="event-error" title="${escapeHtml(e.error)}">${escapeHtml(truncate(e.error, 60))}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * If this event represents a recovery (to_status: 'up', non-unknown
 * from_status), find the preceding event for the same target and
 * compute the duration.
 * Returns a human string like "2m 14s" or null.
 */
function computeDuration(e) {
  if (e.to_status !== 'up') return null;
  if (e.from_status === 'unknown') return null;    // not a real incident

  // Find the most recent earlier event for the same target
  const thisTs = new Date(e.created_at).getTime();
  let prev = null;
  for (const candidate of currentEvents) {
    if (candidate.target_id !== e.target_id) continue;
    const t = new Date(candidate.created_at).getTime();
    if (t < thisTs) {
      if (!prev || t > new Date(prev.created_at).getTime()) {
        prev = candidate;
      }
    }
  }

  if (!prev) return null;

  const ms = thisTs - new Date(prev.created_at).getTime();
  return formatDuration(ms);
}

function formatDuration(ms) {
  if (ms < 1000) return '<1s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem  = secs % 60;
  if (mins < 60) return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function prependEvent(e) {
  const list = document.getElementById('events-list');
  const countEl = document.getElementById('events-count');
  if (!list) return;

  const empty = list.querySelector('.monitoring-empty');
  if (empty) list.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderEventRow(e).trim();
  const node = wrapper.firstElementChild;
  node.classList.add('monitoring-event--new');
  list.prepend(node);

  // Cap at 50 rows
  while (list.children.length > 50) {
    list.removeChild(list.lastElementChild);
  }

  if (countEl) countEl.textContent = String(list.children.length);

  setTimeout(() => node.classList.remove('monitoring-event--new'), 2000);
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
