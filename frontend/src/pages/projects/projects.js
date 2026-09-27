/**
 * Projects Page
 * Professional portfolio management with stats bar, filter pills,
 * debounced search, client/location dropdowns, sort, grid/list toggle
 * (persisted), review flags, and empty states.
 */

import { renderSidebar, initSidebar } from '../../components/sidebar.js';
import { projectService } from '../../services/projectService.js';
import { uploadImage } from '../../services/uploadService.js';
import { renderProjectCard } from '../../components/projectCard.js';
import { showModal } from '../../components/modal.js';
import { renderProjectForm } from '../../components/projectForm.js';
import { showToast } from '../../utils/notifications.js';
import { confirmDialog } from '../../utils/confirm.js';

/* ============================================================
   CONSTANTS
   ============================================================ */

const VIEW_STORAGE_KEY = 'ev_projects_view';
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_ORDER = ['Live', 'Development', 'Planning', 'Maintenance', 'Archived'];

const STATS_DEFINITION = [
  { key: 'all',         label: 'Total',        icon: 'fa-folder-open',      color: 'primary' },
  { key: 'Live',        label: 'Live',         icon: 'fa-circle-check',     color: 'live' },
  { key: 'Development', label: 'Development',  icon: 'fa-code',             color: 'dev' },
  { key: 'Planning',    label: 'Planning',     icon: 'fa-drafting-compass', color: 'planning' },
  { key: 'Maintenance', label: 'Maintenance',  icon: 'fa-wrench',           color: 'maintenance' },
  { key: 'Archived',    label: 'Archived',     icon: 'fa-box-archive',      color: 'archived' }
];

/* ============================================================
   HELPERS
   ============================================================ */

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(fn, wait) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function readStoredView() {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    return v === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

function storeView(view) {
  try { localStorage.setItem(VIEW_STORAGE_KEY, view); } catch { /* ignore */ }
}

function parseTech(tech) {
  if (!tech) return [];
  if (Array.isArray(tech)) return tech.filter(Boolean);
  if (typeof tech === 'string') {
    try {
      const parsed = JSON.parse(tech);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === 'string') return parsed.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    } catch {
      return tech.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }).map(() => `
    <div class="card project-card skeleton-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-badge"></div>
    </div>
  `).join('');
}

/* ============================================================
   PAGE ENTRY
   ============================================================ */

export async function projectsPage() {
  document.body.classList.add('app-dashboard');

  const app = document.getElementById('app');
  const initialView = readStoredView();

  app.innerHTML = `
    ${renderSidebar()}

    <div class="main-content">
      <!-- ============================================================
           HEADER
           ============================================================ -->
      <div class="projects-header-enhanced">
        <div class="projects-header-text">
          <div class="projects-header-title">
            <div class="page-icon"><i class="fas fa-folder-open"></i></div>
            <div>
              <h2>Projects</h2>
              <p class="page-subtitle">Manage your portfolio, monitor status, and track reviews</p>
            </div>
          </div>
        </div>

        <div class="projects-header-actions">
          <div class="view-toggle" role="group" aria-label="View mode">
            <button class="view-toggle-btn ${initialView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view" aria-label="Grid view">
              <i class="fas fa-th-large"></i><span>Grid</span>
            </button>
            <button class="view-toggle-btn ${initialView === 'list' ? 'active' : ''}" data-view="list" title="List view" aria-label="List view">
              <i class="fas fa-list"></i><span>List</span>
            </button>
          </div>

          <button id="add-project-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> Add Project
          </button>
        </div>
      </div>

      <!-- ============================================================
           STATS BAR
           ============================================================ -->
      <div class="projects-stats-bar" id="projects-stats-bar">
        ${STATS_DEFINITION.map(s => `
          <button class="projects-stat-card stat-${s.color}" data-stat="${s.key}" type="button">
            <span class="projects-stat-icon"><i class="fas ${s.icon}"></i></span>
            <span class="projects-stat-value" data-stat-value="${s.key}">—</span>
            <span class="projects-stat-label">${s.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- ============================================================
           FILTER PILLS
           ============================================================ -->
      <div class="filter-bar" id="status-filter-bar">
        <button class="filter-pill active" data-status="all">All</button>
        ${STATUS_ORDER.map(s => `
          <button class="filter-pill" data-status="${s}">${s}</button>
        `).join('')}
      </div>

      <!-- ============================================================
           TOOLBAR
           ============================================================ -->
      <div class="projects-toolbar">
        <div class="search-wrapper">
          <i class="fas fa-search"></i>
          <input
            type="text"
            id="search"
            placeholder="Search by name, client, tech, or tags..."
            autocomplete="off"
          />
        </div>

        <select id="client-filter" class="filter-select" aria-label="Filter by client">
          <option value="">All Clients</option>
        </select>

        <select id="location-filter" class="filter-select" aria-label="Filter by location">
          <option value="">All Locations</option>
        </select>

        <select id="sort-select" class="filter-select" aria-label="Sort projects">
          <option value="updated-desc">Newest First</option>
          <option value="updated-asc">Oldest First</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="client-asc">Client A–Z</option>
          <option value="client-desc">Client Z–A</option>
        </select>

        <button id="clear-filters-btn" class="btn btn-ghost btn-sm hidden" type="button">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>

      <!-- ============================================================
           LOADING SKELETON
           ============================================================ -->
      <div id="loading-skeleton" class="projects-grid">
        ${renderSkeletonCards(6)}
      </div>

      <!-- ============================================================
           PROJECTS CONTAINER
           ============================================================ -->
      <div id="projects-container" class="projects-grid hidden"></div>

      <!-- ============================================================
           EMPTY STATE
           ============================================================ -->
      <div id="empty-state" class="projects-empty-state hidden">
        <div class="projects-empty-icon">
          <i class="fas fa-folder-open"></i>
        </div>
        <h3 class="projects-empty-title">No projects found</h3>
        <p class="projects-empty-text" id="empty-state-text">
          Try adjusting your filters, or add your first project to get started.
        </p>
        <div class="projects-empty-cta">
          <button class="btn btn-primary" id="empty-add-btn">
            <i class="fas fa-plus"></i> Add Project
          </button>
          <button class="btn btn-outline hidden" id="empty-clear-btn">
            <i class="fas fa-times"></i> Clear Filters
          </button>
        </div>
      </div>
    </div>
  `;

  initSidebar();

  /* ============================================================
     STATE
     ============================================================ */
  let allProjects = [];
  let projects = [];
  let currentView = initialView;
  let currentStatus = 'all';
  let currentClient = '';
  let currentLocation = '';
  let currentSort = 'updated-desc';
  let searchTerm = '';

  /* ============================================================
     URL PARAM PRE-FILTER
     ============================================================ */
  const hash = location.hash.split('?')[1] || '';
  const params = new URLSearchParams(hash);
  const urlFilter = params.get('filter');
  if (urlFilter === 'live')          currentStatus = 'Live';
  else if (urlFilter === 'clients')  currentStatus = 'all';
  else if (urlFilter === 'revenue')  { location.hash = '#finance'; return; }

  /* ============================================================
     DOM REFS
     ============================================================ */
  const $ = (sel) => document.querySelector(sel);

  const searchInput     = $('#search');
  const clientFilter    = $('#client-filter');
  const locationFilter  = $('#location-filter');
  const sortSelect      = $('#sort-select');
  const clearBtn        = $('#clear-filters-btn');
  const container       = $('#projects-container');
  const skeleton        = $('#loading-skeleton');
  const emptyState      = $('#empty-state');
  const emptyStateText  = $('#empty-state-text');
  const emptyAddBtn     = $('#empty-add-btn');
  const emptyClearBtn   = $('#empty-clear-btn');
  const addProjectBtn   = $('#add-project-btn');
  const statusFilterBar = $('#status-filter-bar');
  const statsBar        = $('#projects-stats-bar');

  // Sync UI with URL-driven state
  if (currentStatus !== 'all') {
    document.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === currentStatus);
    });
  }

  /* ============================================================
     STATS BAR
     ============================================================ */
  function computeStats(list) {
    const stats = { all: list.length };
    STATUS_ORDER.forEach(s => { stats[s] = 0; });
    list.forEach(p => {
      if (p.status && stats[p.status] !== undefined) stats[p.status] += 1;
    });
    return stats;
  }

  function updateStatsBar() {
    const stats = computeStats(allProjects);
    statsBar.querySelectorAll('[data-stat-value]').forEach(el => {
      const key = el.getAttribute('data-stat-value');
      el.textContent = stats[key] ?? 0;
    });
    statsBar.querySelectorAll('.projects-stat-card').forEach(card => {
      card.classList.toggle('active', card.dataset.stat === currentStatus);
    });
  }

  /* ============================================================
     DYNAMIC FILTERS
     ============================================================ */
  function populateDynamicFilters() {
    const clients = new Set();
    const locations = new Set();

    allProjects.forEach(p => {
      if (p.client && p.client.trim()) clients.add(p.client.trim());
      if (p.location && p.location.trim()) locations.add(p.location.trim());
    });

    const sortAlpha = (a, b) => a.localeCompare(b);

    // Clients
    const clientOptions = ['<option value="">All Clients</option>'];
    [...clients].sort(sortAlpha).forEach(c => {
      clientOptions.push(`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
    });
    clientFilter.innerHTML = clientOptions.join('');
    if (currentClient && [...clients].includes(currentClient)) {
      clientFilter.value = currentClient;
    } else {
      currentClient = '';
      clientFilter.value = '';
    }

    // Locations
    const locOptions = ['<option value="">All Locations</option>'];
    [...locations].sort(sortAlpha).forEach(l => {
      locOptions.push(`<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`);
    });
    locationFilter.innerHTML = locOptions.join('');
    if (currentLocation && [...locations].includes(currentLocation)) {
      locationFilter.value = currentLocation;
    } else {
      currentLocation = '';
      locationFilter.value = '';
    }
  }

  /* ============================================================
     LOADING
     ============================================================ */
  async function loadProjects(search = '') {
    skeleton.classList.remove('hidden');
    container.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
      const result = await projectService.getAll(search);
      allProjects = Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Failed to load projects:', err);
      showToast('Failed to load projects. Check connection.', 'error');
      allProjects = [];
    }

    populateDynamicFilters();
    updateStatsBar();
    applyFiltersAndRender();

    skeleton.classList.add('hidden');
    container.classList.remove('hidden');
  }

  /* ============================================================
     FILTER + SORT PIPELINE
     ============================================================ */
  function applyFiltersAndRender() {
    let list = [...allProjects];

    if (currentStatus !== 'all') {
      list = list.filter(p => p.status === currentStatus);
    }
    if (currentClient) {
      list = list.filter(p => (p.client || '').trim() === currentClient);
    }
    if (currentLocation) {
      list = list.filter(p => (p.location || '').trim() === currentLocation);
    }

    list.sort(getComparator(currentSort));
    projects = list;

    updateStatsBar();

    const hasFilters =
      currentStatus !== 'all' ||
      currentClient ||
      currentLocation ||
      (searchInput.value && searchInput.value.trim());
    clearBtn.classList.toggle('hidden', !hasFilters);

    if (list.length === 0) {
      renderEmptyState();
    } else {
      emptyState.classList.add('hidden');
      renderProjects();
    }
  }

  function getComparator(sortKey) {
    const str = (v) => (v || '').toString().toLowerCase();
    const date = (v) => {
      const d = new Date(v || 0);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    switch (sortKey) {
      case 'name-asc':    return (a, b) => str(a.name).localeCompare(str(b.name));
      case 'name-desc':   return (a, b) => str(b.name).localeCompare(str(a.name));
      case 'client-asc':  return (a, b) => str(a.client).localeCompare(str(b.client));
      case 'client-desc': return (a, b) => str(b.client).localeCompare(str(a.client));
      case 'updated-asc': return (a, b) => date(a.last_updated) - date(b.last_updated);
      case 'updated-desc':
      default:            return (a, b) => date(b.last_updated) - date(a.last_updated);
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function renderProjects() {
    container.className = currentView === 'grid' ? 'projects-grid' : 'projects-list';
    container.innerHTML = projects.map(p => renderProjectCard(p, currentView)).join('');
    container.classList.remove('hidden');
  }

  function renderEmptyState() {
    const filtered =
      currentStatus !== 'all' || currentClient || currentLocation ||
      (searchInput.value && searchInput.value.trim());

    emptyStateText.textContent = filtered
      ? 'No projects match your current filters. Try adjusting them.'
      : 'You have not added any projects yet. Start by creating your first one.';

    emptyAddBtn.classList.toggle('hidden', filtered);
    emptyClearBtn.classList.toggle('hidden', !filtered);

    emptyState.classList.remove('hidden');
    container.classList.add('hidden');
  }

  /* ============================================================
     PROJECT ACTIONS
     ============================================================ */
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('edit-project')) {
      handleEdit(btn.dataset.id);
    } else if (btn.classList.contains('delete-project')) {
      handleDelete(btn.dataset.id);
    } else if (btn.classList.contains('copy-link')) {
      handleCopyLink(btn.dataset.token);
    } else if (btn.classList.contains('quick-view-project')) {
      handleQuickView(btn.dataset.id);
    } else if (btn.classList.contains('service-record-project')) {
      location.hash = `#service-record?project_id=${btn.dataset.id}`;
    }
  });

  /* ============================================================
     QUICK VIEW MODAL
     ============================================================ */
  function handleQuickView(projectId) {
    const project = allProjects.find(p => String(p.id) === String(projectId));
    if (!project) return showToast('Project not found', 'error');

    const techList = parseTech(project.tech_stack);
    const techStack = techList.length ? techList.join(', ') : '—';
    const tags = project.tags || '—';
    const statusClass = (project.status || '').toLowerCase();

    const content = `
      <div class="modal-header-bar">
        <h2><i class="fas fa-circle-info"></i> ${escapeHtml(project.name)}</h2>
        <span class="status ${statusClass}">${escapeHtml(project.status) || '—'}</span>
      </div>

      <div class="quick-view-grid">
        <div><strong>Client</strong> ${escapeHtml(project.client) || '—'}</div>
        <div><strong>Client Number</strong> ${escapeHtml(project.client_number) || '—'}</div>
        <div><strong>Client Email</strong> ${escapeHtml(project.client_email) || '—'}</div>
        <div><strong>Project Type</strong> ${escapeHtml(project.project_type) || '—'}</div>
        <div><strong>Location</strong> ${escapeHtml(project.location) || '—'}</div>
        <div><strong>Hosting</strong> ${escapeHtml(project.hosting) || '—'}</div>
        <div><strong>Database</strong> ${escapeHtml(project.database_host) || '—'}</div>
        <div><strong>Domain</strong> ${escapeHtml(project.domain_name) || '—'}</div>
        <div><strong>Registrar</strong> ${escapeHtml(project.registrar) || '—'}</div>
        <div><strong>Domain Expiry</strong> ${formatDate(project.expiry_date)}</div>
        <div><strong>Live URL</strong>
          ${project.live_url
            ? `<a href="${escapeHtml(project.live_url)}" target="_blank" rel="noopener">${escapeHtml(project.live_url)}</a>`
            : '—'}
        </div>
        <div><strong>GitHub</strong>
          ${project.github
            ? `<a href="${escapeHtml(project.github)}" target="_blank" rel="noopener">${escapeHtml(project.github)}</a>`
            : '—'}
        </div>
        <div><strong>Tech Stack</strong> ${escapeHtml(techStack)}</div>
        <div><strong>Tags</strong> ${escapeHtml(tags)}</div>
        <div><strong>Last Updated</strong> ${formatDateTime(project.last_updated)}</div>
        <div><strong>Next Review</strong> ${formatDate(project.next_review_date)}</div>
      </div>

      ${project.for_sale ? `
        <div class="quick-view-forsale">
          <i class="fas fa-tag"></i>
          <strong>For Sale</strong>
          ${project.asking_price ? `<span>Asking: $${Number(project.asking_price).toLocaleString()}</span>` : ''}
        </div>
      ` : ''}

      <div class="form-group" style="margin-top:1.25rem;">
        <strong style="display:block;margin-bottom:0.4rem;color:var(--primary);font-family:var(--font-display);font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;">Description</strong>
        <p style="color:var(--text-secondary);line-height:1.6;">${escapeHtml(project.description) || 'No description provided.'}</p>
      </div>

      <div class="form-actions">
        <button class="btn btn-outline service-record-from-modal" data-id="${project.id}">
          <i class="fas fa-history"></i> Service Record
        </button>
        <button class="btn btn-outline" id="close-quick-view-btn">
          <i class="fas fa-arrow-left"></i> Back
        </button>
      </div>
    `;

    const { close } = showModal(content);
    document.getElementById('close-quick-view-btn')?.addEventListener('click', close);
    document.querySelector('.service-record-from-modal')?.addEventListener('click', () => {
      close();
      location.hash = `#service-record?project_id=${project.id}`;
    });
  }

  /* ============================================================
     EDIT
     ============================================================ */
  async function handleEdit(projectId) {
    const project = allProjects.find(p => String(p.id) === String(projectId));
    if (!project) return showToast('Project not found', 'error');

    const { close } = showModal(renderProjectForm(project));
    const form = document.getElementById('project-form');
    if (!form) return;

    document.querySelector('.cancel-form-btn')?.addEventListener('click', () => close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById('project-thumbnail-file');
      const thumbnailUrlInput = document.getElementById('project-thumbnail');

      if (fileInput && fileInput.files.length > 0) {
        try {
          showToast('Uploading image...', 'info');
          const { url } = await uploadImage(fileInput.files[0]);
          thumbnailUrlInput.value = url;
        } catch (err) {
          showToast(err.message || 'Upload failed', 'error');
          return;
        }
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        await projectService.update(projectId, data);
        close();
        await loadProjects(searchInput.value);
        showToast('Project updated', 'success');
      } catch (err) {
        showToast(err.message || 'Update failed', 'error');
      }
    });
  }

  /* ============================================================
     CREATE
     ============================================================ */
  function handleCreate() {
    const { close } = showModal(renderProjectForm());
    const form = document.getElementById('project-form');
    if (!form) return;

    document.querySelector('.cancel-form-btn')?.addEventListener('click', () => close());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById('project-thumbnail-file');
      const thumbnailUrlInput = document.getElementById('project-thumbnail');

      if (fileInput && fileInput.files.length > 0) {
        try {
          showToast('Uploading image...', 'info');
          const { url } = await uploadImage(fileInput.files[0]);
          thumbnailUrlInput.value = url;
        } catch (err) {
          showToast(err.message || 'Upload failed', 'error');
          return;
        }
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        await projectService.create(data);
        close();
        await loadProjects(searchInput.value);
        showToast('Project created', 'success');
      } catch (err) {
        showToast(err.message || 'Create failed', 'error');
      }
    });
  }

  /* ============================================================
     DELETE
     ============================================================ */
  async function handleDelete(projectId) {
    const confirmed = await confirmDialog(
      'Delete this project? This action cannot be undone.',
      'Confirm Deletion'
    );
    if (!confirmed) return;

    try {
      await projectService.delete(projectId);
      await loadProjects(searchInput.value);
      showToast('Project deleted', 'success');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  }

  /* ============================================================
     COPY LINK
     ============================================================ */
  function handleCopyLink(token) {
    if (!token) {
      showToast('No public link available for this project', 'error');
      return;
    }
    const link = `${window.location.origin}/#public-status?token=${token}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast('Public link copied', 'success'))
      .catch(() => showToast('Failed to copy link', 'error'));
  }

  /* ============================================================
     CONTROLS
     ============================================================ */

  const debouncedSearch = debounce((value) => {
    searchTerm = value.trim();
    loadProjects(searchTerm);
  }, SEARCH_DEBOUNCE_MS);

  searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

  clientFilter.addEventListener('change', (e) => {
    currentClient = e.target.value;
    applyFiltersAndRender();
  });

  locationFilter.addEventListener('change', (e) => {
    currentLocation = e.target.value;
    applyFiltersAndRender();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndRender();
  });

  statusFilterBar.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    statusFilterBar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentStatus = pill.dataset.status;
    applyFiltersAndRender();
  });

  statsBar.addEventListener('click', (e) => {
    const card = e.target.closest('.projects-stat-card');
    if (!card) return;
    const stat = card.dataset.stat;

    currentStatus = stat;

    statusFilterBar.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === stat);
    });

    applyFiltersAndRender();
  });

  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === currentView) return;
      currentView = view;
      storeView(view);
      document.querySelectorAll('.view-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === view);
      });
      if (projects.length > 0) renderProjects();
    });
  });

  function clearAllFilters() {
    currentStatus = 'all';
    currentClient = '';
    currentLocation = '';
    searchInput.value = '';
    clientFilter.value = '';
    locationFilter.value = '';
    statusFilterBar.querySelectorAll('.filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.status === 'all');
    });
    loadProjects('');
  }

  clearBtn.addEventListener('click', clearAllFilters);
  emptyClearBtn.addEventListener('click', clearAllFilters);

  addProjectBtn.addEventListener('click', handleCreate);
  emptyAddBtn.addEventListener('click', handleCreate);

  /* ============================================================
     INITIAL LOAD
     ============================================================ */
  await loadProjects();
}
