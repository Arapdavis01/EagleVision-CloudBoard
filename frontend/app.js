/* ========== EAGLEVISION PRO APP – with Features 1‑8 ========== */
const API = 'https://eaglevision-api.onrender.com/api';
let currentPage = 'dashboard';
let viewMode = 'grid';
let charts = {};
let projectsCache = [];

// ---------- HELPERS ----------
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount || 0);
}
async function fetchJSON(url, options = {}) {
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------- MODAL SYSTEM ----------
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal-content').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').classList.add('hidden');
}
document.getElementById('modal-overlay').addEventListener('click', closeModal);

// ---------- AUTH ----------
async function checkAuth() { try { await fetchJSON(`${API}/auth/check`); return true; } catch { return false; } }
async function login(email, password) { return fetchJSON(`${API}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }); }
async function logout() { try { await fetchJSON(`${API}/auth/logout`, { method: 'POST' }); } finally { location.reload(); } }

// ---------- ROUTING ----------
function navigate(page, param = null) {
  currentPage = page;
  if (param) window.history.pushState(null, '', `?id=${param}`);
  else window.history.pushState(null, '', window.location.pathname);
  renderApp();
}

// ---------- CHART CLEANUP ----------
function destroyCharts() { Object.values(charts).forEach(c => c.destroy()); charts = {}; }

// ---------- SIDEBAR TOGGLE ----------
function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('collapsed'); }

// ---------- LOGIN (unchanged) ----------
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container" style="display:flex;align-items:center;justify-content:center;height:100vh;">
      <div class="glass" style="padding:2.5rem;width:100%;max-width:400px;">
        <h2 style="text-align:center;margin-bottom:1.5rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;">
          <i class="fas fa-binoculars" style="color:var(--accent);"></i> EagleVision
        </h2>
        <form id="loginForm">
          <label style="display:block;margin-bottom:0.3rem;font-weight:600;">Email</label>
          <input type="email" id="loginEmail" required style="width:100%;padding:0.7rem;margin-bottom:1rem;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:var(--radius-lg);color:white;" />
          <label style="display:block;margin-bottom:0.3rem;font-weight:600;">Password</label>
          <input type="password" id="loginPassword" required style="width:100%;padding:0.7rem;margin-bottom:1.5rem;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:var(--radius-lg);color:white;" />
          <div id="loginError" style="color:var(--danger);font-size:0.85rem;margin-bottom:1rem;min-height:1.2em;"></div>
          <button type="submit" class="btn btn-primary" style="width:100%;" id="loginBtn"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    if (!email || !password) { errorDiv.textContent = 'Please fill in both fields.'; return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Signing in...';
    errorDiv.textContent = '';
    try {
      await login(email, password);
      location.reload();
    } catch (err) {
      errorDiv.textContent = 'Invalid credentials.';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });
}

// ---------- DASHBOARD (with upgrade reminders) ----------
async function renderDashboard() {
  destroyCharts();
  const proj = await fetchJSON(`${API}/projects`).catch(() => []);
  projectsCache = proj;
  const fin = await fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] }));
  const upt = await fetchJSON(`${API}/uptime/status`).catch(() => []);
  const totalProjects = proj.length;
  const liveProjects = upt.filter(p => p.status === 'up').length;
  const clients = [...new Set(proj.map(p => p.client_name).filter(Boolean))];
  const totalRevenue = fin.total || 0;

  // Upgrade reminders: projects with next_review_date within 30 days or past
  const now = new Date();
  const upcomingReviews = proj.filter(p => p.next_review_date && new Date(p.next_review_date) <= new Date(now.getTime() + 30*24*60*60*1000));

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1 style="margin-bottom:1.5rem;"><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Projects</div><div class="stat-value">${totalProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Live Projects</div><div class="stat-value">${liveProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Active Clients</div><div class="stat-value">${clients.length}</div></div>
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
    </div>
    <div style="display:flex; gap:1rem; margin-bottom:2rem;">
      <button class="btn btn-primary" onclick="openAddProjectModal()"><i class="fas fa-plus"></i> Add Project</button>
      <button class="btn btn-success" onclick="openSaleModal()"><i class="fas fa-money-bill-wave"></i> Record Sale</button>
    </div>
    ${upcomingReviews.length > 0 ? `
      <div style="background:var(--glass-bg); backdrop-filter:blur(12px); border-radius:var(--radius-xl); padding:1.5rem; margin-bottom:2rem;">
        <h3><i class="fas fa-clock"></i> Upcoming/Overdue Reviews</h3>
        <ul style="margin-top:1rem; list-style:none;">
          ${upcomingReviews.map(p => `<li style="padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>${p.name}</span> <span style="color:var(--text-dim);">${p.next_review_date ? new Date(p.next_review_date).toLocaleDateString() : '—'}</span>
            <span class="badge badge-${new Date(p.next_review_date) < now ? 'down' : 'warning'}">${new Date(p.next_review_date) < now ? 'Overdue' : 'Due Soon'}</span>
          </li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div style="background:var(--glass-bg); backdrop-filter:blur(12px); border-radius:var(--radius-xl); padding:1.5rem;">
      <h3><i class="fas fa-history"></i> Recent Projects</h3>
      <div style="margin-top:1rem;">
        ${proj.slice(-5).reverse().map(p => `<div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <span>${p.name}</span><span style="color:var(--text-dim);">${p.client_name || '—'}</span>
        </div>`).join('')}
      </div>
    </div>
  `;
}

// ---------- ADD PROJECT MODAL (with new fields) ----------
function openAddProjectModal() {
  showModal(`
    <h3 style="margin-bottom:1rem; color:var(--accent);"><i class="fas fa-plus-circle"></i> Add Project</h3>
    <form id="addProjectForm">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div><label>Name *</label><input type="text" id="pName" required /></div>
        <div><label>Client</label><input type="text" id="pClient" /></div>
        <div><label>Live URL</label><input type="url" id="pUrl" /></div>
        <div><label>GitHub</label><input type="url" id="pGithub" /></div>
        <div><label>Hosting</label><select id="pHosting"><option value="">Select...</option><option>Render</option><option>Vercel</option><option>Netlify</option><option>AWS</option><option>Other</option></select></div>
        <div><label>Location</label><input type="text" id="pLocation" /></div>
        <div><label>Thumbnail URL</label><input type="url" id="pThumb" placeholder="https://..." /></div>
        <div><label>Tech Stack (JSON)</label><input type="text" id="pTech" placeholder='{"frontend":"React","backend":"Node"}' /></div>
        <div><label>Tags (comma separated)</label><input type="text" id="pTags" placeholder="e.g. web, mobile" /></div>
        <div><label>Last Updated</label><input type="date" id="pLastUpdated" /></div>
        <div><label>Next Review Date</label><input type="date" id="pNextReview" /></div>
        <div><label>Status</label>
          <select id="pStatus">
            <option value="planning">Planning</option>
            <option value="development">Development</option>
            <option value="live" selected>Live</option>
            <option value="maintenance">Maintenance</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div style="grid-column:span 2;"><label>Description</label><textarea id="pDesc" rows="2"></textarea></div>
      </div>
      <div style="display:flex; gap:1rem; margin-top:1rem;">
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
        <button type="button" class="btn btn-danger" onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('addProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tags = document.getElementById('pTags').value.split(',').map(t => t.trim()).filter(Boolean);
    let tech = {};
    try { tech = JSON.parse(document.getElementById('pTech').value || '{}'); } catch(e) {}
    const payload = {
      name: document.getElementById('pName').value.trim(),
      client_name: document.getElementById('pClient').value.trim(),
      live_url: document.getElementById('pUrl').value.trim(),
      github_repo: document.getElementById('pGithub').value.trim(),
      hosting_platform: document.getElementById('pHosting').value,
      location: document.getElementById('pLocation').value.trim(),
      thumbnail_url: document.getElementById('pThumb').value.trim(),
      tech_stack: tech,
      tags,
      last_updated: document.getElementById('pLastUpdated').value || null,
      next_review_date: document.getElementById('pNextReview').value || null,
      status: document.getElementById('pStatus').value,
      description: document.getElementById('pDesc').value.trim()
    };
    if (!payload.name) return;
    try {
      await fetchJSON(`${API}/projects`, { method: 'POST', body: JSON.stringify(payload) });
      closeModal();
      await refreshAndRender();
    } catch (err) { alert('Error creating project'); }
  });
}

// ---------- EDIT PROJECT MODAL (with new fields) ----------
function openEditProjectModal(project) {
  showModal(`
    <h3 style="margin-bottom:1rem; color:var(--accent);"><i class="fas fa-edit"></i> Edit Project</h3>
    <form id="editProjectForm">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div><label>Name *</label><input type="text" id="eName" value="${project.name}" required /></div>
        <div><label>Client</label><input type="text" id="eClient" value="${project.client_name || ''}" /></div>
        <div><label>Live URL</label><input type="url" id="eUrl" value="${project.live_url || ''}" /></div>
        <div><label>GitHub</label><input type="url" id="eGithub" value="${project.github_repo || ''}" /></div>
        <div><label>Hosting</label><select id="eHosting"><option value="">Select...</option><option>Render</option><option>Vercel</option><option>Netlify</option><option>AWS</option><option>Other</option></select></div>
        <div><label>Location</label><input type="text" id="eLocation" value="${project.location || ''}" /></div>
        <div><label>Thumbnail URL</label><input type="url" id="eThumb" value="${project.thumbnail_url || ''}" /></div>
        <div><label>Tech Stack (JSON)</label><input type="text" id="eTech" value='${JSON.stringify(project.tech_stack || {})}' /></div>
        <div><label>Tags (comma separated)</label><input type="text" id="eTags" value="${(project.tags || []).join(',')}" /></div>
        <div><label>Last Updated</label><input type="date" id="eLastUpdated" value="${project.last_updated || ''}" /></div>
        <div><label>Next Review Date</label><input type="date" id="eNextReview" value="${project.next_review_date || ''}" /></div>
        <div><label>Status</label>
          <select id="eStatus">
            <option value="planning" ${project.status === 'planning' ? 'selected' : ''}>Planning</option>
            <option value="development" ${project.status === 'development' ? 'selected' : ''}>Development</option>
            <option value="live" ${project.status === 'live' ? 'selected' : ''}>Live</option>
            <option value="maintenance" ${project.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
            <option value="archived" ${project.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
        <div style="grid-column:span 2;"><label>Description</label><textarea id="eDesc" rows="2">${project.description || ''}</textarea></div>
      </div>
      <div style="display:flex; gap:1rem; margin-top:1rem;">
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update</button>
        <button type="button" class="btn btn-danger" onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>
      </div>
    </form>
  `);
  document.getElementById('eHosting').value = project.hosting_platform || '';
  document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tags = document.getElementById('eTags').value.split(',').map(t => t.trim()).filter(Boolean);
    let tech = {};
    try { tech = JSON.parse(document.getElementById('eTech').value || '{}'); } catch(e) {}
    const payload = {
      name: document.getElementById('eName').value.trim(),
      client_name: document.getElementById('eClient').value.trim(),
      live_url: document.getElementById('eUrl').value.trim(),
      github_repo: document.getElementById('eGithub').value.trim(),
      hosting_platform: document.getElementById('eHosting').value,
      location: document.getElementById('eLocation').value.trim(),
      thumbnail_url: document.getElementById('eThumb').value.trim(),
      tech_stack: tech,
      tags,
      last_updated: document.getElementById('eLastUpdated').value || null,
      next_review_date: document.getElementById('eNextReview').value || null,
      status: document.getElementById('eStatus').value,
      description: document.getElementById('eDesc').value.trim()
    };
    if (!payload.name) return;
    try {
      await fetchJSON(`${API}/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      closeModal();
      await refreshAndRender();
    } catch (err) { alert('Error updating project'); }
  });
}

// ---------- DELETE CONFIRMATION ----------
function confirmDeleteProject(id, name) {
  showModal(`
    <div style="text-align:center;">
      <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);"></i>
      <h3>Delete ${name}?</h3>
      <p style="margin:1rem 0; color:var(--text-dim);">This action cannot be undone.</p>
      <button class="btn btn-danger" id="confirmDeleteBtn"><i class="fas fa-trash"></i> Delete</button>
      <button class="btn btn-primary" onclick="closeModal()" style="margin-left:1rem;">Cancel</button>
    </div>
  `);
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    await fetchJSON(`${API}/projects/${id}`, { method: 'DELETE' });
    closeModal();
    await refreshAndRender();
  });
}

// ---------- SALE MODAL / INVOICE ----------
function openSaleModal() {
  fetchJSON(`${API}/projects`).then(projects => {
    showModal(`
      <h3><i class="fas fa-plus-circle"></i> Record Sale</h3>
      <form id="saleForm">
        <label>Project</label>
        <select id="saleProject" required>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
        <label>Amount (KES)</label>
        <input type="number" id="saleAmount" required />
        <label>Notes</label>
        <input type="text" id="saleNotes" />
        <div style="margin-top:1rem; display:flex; gap:1rem;">
          <button type="submit" class="btn btn-success"><i class="fas fa-check"></i> Save</button>
          <button type="button" class="btn btn-danger" onclick="closeModal()"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </form>
    `);
    document.getElementById('saleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        project_id: parseInt(document.getElementById('saleProject').value),
        amount: parseFloat(document.getElementById('saleAmount').value),
        notes: document.getElementById('saleNotes').value
      };
      await fetchJSON(`${API}/finance/sales`, { method: 'POST', body: JSON.stringify(payload) });
      closeModal();
      if (currentPage === 'finance') await renderFinance();
      else navigate('finance');
    });
  });
}

function openInvoiceModal(sale) {
  showModal(`
    <div class="invoice-box" style="max-width:500px; margin:0 auto;">
      <h2 style="color:var(--primary);">INVOICE</h2>
      <hr style="margin:1rem 0;" />
      <p><strong>Project:</strong> ${sale.project_name}</p>
      <p><strong>Amount:</strong> ${formatCurrency(sale.amount)}</p>
      <p><strong>Date:</strong> ${new Date(sale.sale_date).toLocaleDateString()}</p>
      <p><strong>Notes:</strong> ${sale.notes || '—'}</p>
      <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
      <button class="btn btn-danger" onclick="closeModal()" style="margin-left:1rem;">Close</button>
    </div>
  `);
}

// ---------- REFRESH & RE-RENDER ----------
async function refreshAndRender() {
  projectsCache = await fetchJSON(`${API}/projects`).catch(() => []);
  switch (currentPage) {
    case 'projects': renderProjects(); break;
    case 'dashboard': renderDashboard(); break;
    default: renderApp();
  }
}

// ---------- PROJECTS PAGE (grid/list, thumbnails, tags, public link) ----------
async function renderProjects() {
  if (projectsCache.length === 0) projectsCache = await fetchJSON(`${API}/projects`).catch(() => []);
  const projects = projectsCache;
  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h1><i class="fas fa-folder-open"></i> Projects</h1>
      <div style="display:flex; gap:1rem;">
        <div class="view-toggle">
          <button class="${viewMode === 'grid' ? 'active' : ''}" onclick="setView('grid')"><i class="fas fa-th-large"></i></button>
          <button class="${viewMode === 'list' ? 'active' : ''}" onclick="setView('list')"><i class="fas fa-list"></i></button>
        </div>
        <button class="btn btn-primary" onclick="openAddProjectModal()"><i class="fas fa-plus"></i> Add</button>
      </div>
    </div>
    <input type="text" id="searchInput" placeholder="Search projects or tags..." class="input-modern" style="margin-bottom:1rem; width:300px;" />
    <div id="projectContainer"></div>
  `;
  renderProjectContainer(projects);
  document.getElementById('searchInput').addEventListener('input', (e) => renderProjectContainer(projectsCache));
}

function setView(mode) { viewMode = mode; renderProjectContainer(projectsCache); }

function renderProjectContainer(projects) {
  const container = document.getElementById('projectContainer');
  if (!container) return;
  const filter = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(filter) ||
    (p.client_name || '').toLowerCase().includes(filter) ||
    (p.tags || []).some(t => t.toLowerCase().includes(filter))
  );

  if (viewMode === 'grid') {
    container.innerHTML = `
      <div class="project-grid">
        ${filtered.map(p => `
          <div class="project-card" onclick="navigate('projectDetail', ${p.id})">
            ${p.thumbnail_url ? `<img src="${p.thumbnail_url}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius-lg);margin-bottom:0.5rem;" />` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3>${p.name}</h3>
              <span class="status-dot" style="background:${p.liveStatus?.status === 'up' ? 'var(--success)' : 'var(--danger)'};"></span>
            </div>
            <p style="color:var(--text-dim);">${p.client_name || 'No client'}</p>
            <div style="margin:0.5rem 0;">
              <span class="badge badge-info" style="margin-right:0.3rem;">${p.status}</span>
              ${(p.tags || []).map(t => `<span class="badge badge-unknown" style="margin-right:0.3rem;">${t}</span>`).join('')}
            </div>
            ${p.tech_stack && Object.keys(p.tech_stack).length ? `<div style="font-size:0.8rem; color:var(--text-dim);">${Object.entries(p.tech_stack).map(([k,v]) => `${k}: ${v}`).join(', ')}</div>` : ''}
            <div class="actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-primary" onclick="openEditProjectModal(${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-danger" onclick="confirmDeleteProject(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
              <button class="btn btn-sm btn-success" onclick="copyPublicLink('${p.public_token || ''}')"><i class="fas fa-link"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="table-container">
        <table>
          <thead><tr><th>Thumb</th><th>Name</th><th>Client</th><th>Status</th><th>Tags</th><th>Public</th><th>Actions</th></tr></thead>
          <tbody>
            ${filtered.map(p => `
              <tr>
                <td>${p.thumbnail_url ? `<img src="${p.thumbnail_url}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;" />` : '—'}</td>
                <td style="cursor:pointer;" onclick="navigate('projectDetail', ${p.id})">${p.name}</td>
                <td>${p.client_name || '—'}</td>
                <td><span class="badge badge-${p.liveStatus?.status === 'up' ? 'up' : 'down'}">${p.status}</span></td>
                <td>${(p.tags || []).join(', ') || '—'}</td>
                <td><button class="btn btn-sm btn-success" onclick="copyPublicLink('${p.public_token || ''}')"><i class="fas fa-link"></i></button></td>
                <td>
                  <button class="btn btn-sm btn-primary" onclick="openEditProjectModal(${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-sm btn-danger" onclick="confirmDeleteProject(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function copyPublicLink(token) {
  if (!token) { alert('No public token available.'); return; }
  const link = `https://eaglevision-api.onrender.com/api/projects/public/${token}`;
  navigator.clipboard.writeText(link).then(() => alert('Public status link copied!'));
}

// ---------- PROJECT DETAIL (unchanged) ----------
async function renderProjectDetail(id) {
  const project = await fetchJSON(`${API}/projects/${id}`);
  const history = await fetchJSON(`${API}/uptime/history/${id}?range=24h`).catch(() => []);
  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1>${project.name}</h1>
        <p style="color:var(--text-dim);">${project.client_name || ''}</p>
      </div>
      <span class="badge badge-${project.liveStatus?.status === 'up' ? 'up' : 'down'}">${project.liveStatus?.status || 'unknown'}</span>
    </div>
    <div class="stats-grid" style="margin-top:1.5rem;">
      <div class="stat-card"><div class="stat-label">Latency</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.latency || '—'} ms</div></div>
      <div class="stat-card"><div class="stat-label">Status Code</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.status_code || '—'}</div></div>
      <div class="stat-card"><div class="stat-label">Last Checked</div><div class="stat-value" style="font-size:1.2rem;">${project.liveStatus?.checked_at ? new Date(project.liveStatus.checked_at).toLocaleString() : '—'}</div></div>
    </div>
    <div style="margin:1.5rem 0;">
      <h3><i class="fas fa-chart-line"></i> Response Time History</h3>
      <canvas id="lineChart" height="100"></canvas>
    </div>
    <button class="btn btn-primary" onclick="navigate('projects')"><i class="fas fa-arrow-left"></i> Back</button>
  `;
  const labels = history.map(h => new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const data = history.map(h => h.response_time_ms);
  const ctx = document.getElementById('lineChart').getContext('2d');
  charts.lineChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Response Time (ms)', data, borderColor: '#f4a261', backgroundColor: 'rgba(244,162,97,0.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
    options: { responsive: true }
  });
}

// ---------- FINANCE PAGE (unchanged) ----------
async function renderFinance() {
  const [fin, projects] = await Promise.all([
    fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] })),
    fetchJSON(`${API}/projects`).catch(() => [])
  ]);
  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1><i class="fas fa-money-bill-wave"></i> Finance</h1>
    <div class="stats-grid" style="margin-bottom:2rem;">
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(fin.total)}</div></div>
    </div>
    <button class="btn btn-primary" onclick="openSaleModal()"><i class="fas fa-plus"></i> Record Sale</button>
    <div style="margin-top:2rem;">
      <h3>Monthly Revenue</h3>
      <canvas id="monthlyChart" height="80"></canvas>
    </div>
    <div class="table-container" style="margin-top:2rem;">
      <table>
        <thead><tr><th>Project</th><th>Amount</th><th>Date</th><th>Notes</th><th>Invoice</th><th></th></tr></thead>
        <tbody>${fin.sales.map(s => `
          <tr>
            <td>${s.project_name}</td><td>${formatCurrency(s.amount)}</td><td>${new Date(s.sale_date).toLocaleDateString()}</td>
            <td>${s.notes || '—'}</td>
            <td><button class="btn btn-sm btn-primary" onclick="openInvoiceModal(${JSON.stringify(s).replace(/"/g, '&quot;')})"><i class="fas fa-file-invoice"></i></button></td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteSale(${s.id})"><i class="fas fa-trash"></i></button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;
  const monthly = {};
  fin.sales.forEach(s => {
    const month = new Date(s.sale_date).toLocaleString('en', { month: 'short' });
    monthly[month] = (monthly[month] || 0) + parseFloat(s.amount);
  });
  const labels = Object.keys(monthly).slice(-6);
  const values = Object.values(monthly).slice(-6);
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  charts.monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Revenue', data: values, backgroundColor: '#2a9d8f' }] },
    options: { responsive: true }
  });
}
async function deleteSale(id) {
  if (confirm('Delete this sale?')) {
    await fetchJSON(`${API}/finance/sales/${id}`, { method: 'DELETE' });
    if (currentPage === 'finance') renderFinance();
  }
}

// ---------- ALERTS PAGE (unchanged) ----------
async function renderAlerts() {
  const downProjects = await fetchJSON(`${API}/uptime/status`).catch(() => []);
  const down = downProjects.filter(p => p.status === 'down');
  const main = document.querySelector('.main-content');
  main.innerHTML = `<h1><i class="fas fa-exclamation-triangle"></i> Alerts</h1>`;
  if (down.length === 0) {
    main.innerHTML += `<div class="glass" style="text-align:center; padding:2rem;"><i class="fas fa-check-circle" style="color:var(--success);"></i> All systems operational</div>`;
  } else {
    main.innerHTML += down.map(p => `
      <div class="glass" style="margin-bottom:1rem; border-left:4px solid var(--danger); padding:1rem; display:flex; justify-content:space-between;">
        <div><strong>Project #${p.project_id}</strong><div style="color:var(--danger);">DOWN</div><small>${new Date(p.checked_at).toLocaleString()}</small></div>
        <button class="btn btn-sm btn-primary" onclick="resolveAlert(this)"><i class="fas fa-check"></i> Resolve</button>
      </div>
    `).join('');
  }
}
function resolveAlert(btn) {
  const card = btn.closest('.glass');
  card.style.opacity = '0.5';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-check-circle"></i> Acknowledged';
}

// ---------- SIDEBAR & LAYOUT (unchanged) ----------
function renderSidebar() {
  return `
    <div class="sidebar">
      <div class="sidebar-logo"><i class="fas fa-globe-africa"></i> <span>EagleVision</span></div>
      <nav>
        <a class="${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')"><i class="fas fa-tachometer-alt"></i> <span>Dashboard</span></a>
        <a class="${currentPage === 'projects' ? 'active' : ''}" onclick="navigate('projects')"><i class="fas fa-code-branch"></i> <span>Projects</span></a>
        <a class="${currentPage === 'finance' ? 'active' : ''}" onclick="navigate('finance')"><i class="fas fa-money-bill-wave"></i> <span>Finance</span></a>
        <a class="${currentPage === 'alerts' ? 'active' : ''}" onclick="navigate('alerts')"><i class="fas fa-exclamation-circle"></i> <span>Alerts</span></a>
      </nav>
      <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> <span>Sign Out</span></button>
      <button class="sidebar-toggle" onclick="toggleSidebar()"><i class="fas fa-chevron-left"></i></button>
    </div>
    <div class="main-content"></div>
  `;
}

// ---------- APP INIT ----------
async function renderApp() {
  const loggedIn = await checkAuth();
  if (!loggedIn) { renderLogin(); return; }
  document.getElementById('app').innerHTML = `<div class="dashboard-layout">${renderSidebar()}</div>`;
  switch (currentPage) {
    case 'dashboard': await renderDashboard(); break;
    case 'projects': await renderProjects(); break;
    case 'projectDetail': {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) await renderProjectDetail(id); else navigate('projects');
      break;
    }
    case 'finance': await renderFinance(); break;
    case 'alerts': await renderAlerts(); break;
    default: navigate('dashboard');
  }
}

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  currentPage = params.get('id') ? 'projectDetail' : 'dashboard';
  renderApp();
});

// Start
renderApp();
