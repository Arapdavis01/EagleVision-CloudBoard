/* ========== CONFIG ========== */
const API = 'https://eaglevision-api.onrender.com/api';
let currentPage = 'dashboard';
let charts = {};

// ---------- HELPERS ----------
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES'
  }).format(amount || 0);
}

async function fetchJSON(url, options = {}) {
  const fetchOptions = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };
  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// ---------- AUTH ----------
async function checkAuth() {
  try {
    await fetchJSON(`${API}/auth/check`);
    return true;
  } catch {
    return false;
  }
}

async function login(email, password) {
  return fetchJSON(`${API}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function logout() {
  try {
    await fetchJSON(`${API}/auth/logout`, { method: 'POST' });
  } finally {
    location.reload();
  }
}

// ---------- ROUTING ----------
function navigate(page, param = null) {
  currentPage = page;
  if (param) {
    window.history.pushState(null, '', `?id=${param}`);
  } else {
    window.history.pushState(null, '', window.location.pathname);
  }
  renderApp();
}

// ---------- CHART CLEANUP ----------
function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

// ---------- LOGIN PAGE ----------
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-container">
      <div class="glass card">
        <h2 style="font-size:1.8rem; text-align:center; margin-bottom:1.5rem; color:var(--primary);">
          <i class="fas fa-binoculars" style="margin-right:0.5rem;"></i> EagleVision
        </h2>
        <form id="loginForm">
          <label>Email</label>
          <input type="email" id="loginEmail" required autocomplete="email" />
          <label>Password</label>
          <input type="password" id="loginPassword" required autocomplete="current-password" />
          <div id="loginError" style="color:var(--danger); font-size:0.85rem; min-height:1.2em;"></div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;" id="loginBtn">
            <i class="fas fa-sign-in-alt"></i> Sign In
          </button>
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

    if (!email || !password) {
      errorDiv.textContent = 'Please fill in both fields.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Signing in...';
    errorDiv.textContent = '';

    try {
      await login(email, password);
      location.reload();
    } catch (err) {
      errorDiv.textContent = 'Invalid email or password.';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });
}

// ---------- DASHBOARD ----------
async function renderDashboard() {
  destroyCharts();

  const [proj, fin, upt] = await Promise.all([
    fetchJSON(`${API}/projects`).catch(() => []),
    fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] })),
    fetchJSON(`${API}/uptime/status`).catch(() => [])
  ]);

  const totalProjects = Array.isArray(proj) ? proj.length : 0;
  const totalRevenue = fin.total || 0;
  const upCount = Array.isArray(upt) ? upt.filter(p => p.status === 'up').length : 0;
  const uptimePercent = totalProjects ? ((upCount / totalProjects) * 100).toFixed(1) : 0;
  const critical = totalProjects - upCount;

  const labels = [], values = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 60 * 60000);
    labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    values.push(Math.floor(Math.random() * 300 + 50));
  }

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1>Dashboard</h1>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Projects</div><div class="stat-value">${totalProjects}</div></div>
      <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Uptime</div><div class="stat-value">${uptimePercent}%</div></div>
      <div class="stat-card"><div class="stat-label">Critical Alerts</div><div class="stat-value">${critical}</div></div>
    </div>
    <div class="chart-box">
      <h3>Response Time (24h)</h3>
      <canvas id="respChart"></canvas>
    </div>
  `;

  const ctx = document.getElementById('respChart').getContext('2d');
  charts.respChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg Response Time (ms)',
        data: values,
        backgroundColor: 'rgba(30,58,95,0.6)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ---------- PROJECTS (with Add button) ----------
async function renderProjects() {
  const projects = await fetchJSON(`${API}/projects`).catch(() => []);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <h1>Projects</h1>
      <button class="btn btn-primary" id="showAddProjectBtn"><i class="fas fa-plus"></i> Add Project</button>
    </div>

    <div id="addProjectForm" style="display:none; margin:1.5rem 0;" class="glass card">
      <h3 style="margin-bottom:1rem; color:var(--primary);">New Project</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
        <div>
          <label>Project Name *</label>
          <input type="text" id="newProjectName" class="input-modern" required />
        </div>
        <div>
          <label>Client Name</label>
          <input type="text" id="newClientName" class="input-modern" />
        </div>
        <div>
          <label>Live URL</label>
          <input type="url" id="newLiveUrl" class="input-modern" placeholder="https://..." />
        </div>
        <div>
          <label>GitHub Repo</label>
          <input type="url" id="newGithubRepo" class="input-modern" placeholder="https://github.com/..." />
        </div>
        <div>
          <label>Hosting Platform</label>
          <select id="newHostingPlatform" class="input-modern">
            <option value="">Select...</option>
            <option value="Render">Render</option>
            <option value="Vercel">Vercel</option>
            <option value="Netlify">Netlify</option>
            <option value="AWS">AWS</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label>Location</label>
          <input type="text" id="newLocation" class="input-modern" placeholder="e.g. Nairobi" />
        </div>
        <div style="grid-column: span 2;">
          <label>Description</label>
          <textarea id="newDescription" class="input-modern" rows="2"></textarea>
        </div>
      </div>
      <div style="margin-top:1rem; display:flex; gap:0.5rem;">
        <button class="btn btn-success" id="saveProjectBtn"><i class="fas fa-save"></i> Save Project</button>
        <button class="btn btn-danger btn-sm" id="cancelAddProjectBtn"><i class="fas fa-times"></i> Cancel</button>
      </div>
    </div>

    <input type="text" id="searchInput" placeholder="Search projects..." style="margin-bottom:1rem; max-width:300px;" class="input-modern" />
    <div class="table-container">
      <table class="table-modern">
        <thead><tr><th>Name</th><th>Client</th><th>Status</th><th>Latency</th></tr></thead>
        <tbody id="projectTableBody"></tbody>
      </table>
    </div>
  `;

  // Event listeners
  document.getElementById('showAddProjectBtn').addEventListener('click', () => {
    document.getElementById('addProjectForm').style.display = 'block';
  });
  document.getElementById('cancelAddProjectBtn').addEventListener('click', () => {
    document.getElementById('addProjectForm').style.display = 'none';
  });

  document.getElementById('saveProjectBtn').addEventListener('click', async () => {
    const name = document.getElementById('newProjectName').value.trim();
    if (!name) {
      alert('Project name is required.');
      return;
    }
    const payload = {
      name,
      client_name: document.getElementById('newClientName').value.trim(),
      live_url: document.getElementById('newLiveUrl').value.trim(),
      github_repo: document.getElementById('newGithubRepo').value.trim(),
      hosting_platform: document.getElementById('newHostingPlatform').value,
      location: document.getElementById('newLocation').value.trim(),
      description: document.getElementById('newDescription').value.trim()
    };
    try {
      await fetchJSON(`${API}/projects`, { method: 'POST', body: JSON.stringify(payload) });
      document.getElementById('addProjectForm').style.display = 'none';
      renderProjects(); // refresh list
    } catch (err) {
      alert('Failed to create project.');
    }
  });

  function renderList(filter = '') {
    const term = filter.toLowerCase();
    const filtered = projects.filter(p =>
      p.name.toLowerCase().includes(term) || (p.client_name || '').toLowerCase().includes(term)
    );
    const tbody = document.getElementById('projectTableBody');
    tbody.innerHTML = filtered.map(p => `
      <tr class="clickable" data-id="${p.id}">
        <td>${p.name}</td>
        <td>${p.client_name || '—'}</td>
        <td><span class="badge badge-${p.liveStatus?.status === 'up' ? 'up' : 'down'}">${p.liveStatus?.status || 'unknown'}</span></td>
        <td>${p.liveStatus?.latency ? p.liveStatus.latency + 'ms' : '—'}</td>
      </tr>
    `).join('');

    document.querySelectorAll('#projectTableBody tr').forEach(row => {
      row.addEventListener('click', () => navigate('projectDetail', row.dataset.id));
    });
  }

  renderList();
  document.getElementById('searchInput').addEventListener('input', (e) => renderList(e.target.value));
}

// ---------- PROJECT DETAIL ----------
async function renderProjectDetail(id) {
  const project = await fetchJSON(`${API}/projects/${id}`);
  const history = await fetchJSON(`${API}/uptime/history/${id}?range=24h`).catch(() => []);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
      <div>
        <h1>${project.name}</h1>
        <p style="color:#64748b;">${project.client_name || ''}</p>
      </div>
      <span class="badge badge-${project.liveStatus?.status === 'up' ? 'up' : 'down'}">${project.liveStatus?.status || 'unknown'}</span>
    </div>
    <div class="stats-grid" style="margin-top:1.5rem;">
      <div class="stat-card"><div class="stat-label">Latency</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.latency || '—'} ms</div></div>
      <div class="stat-card"><div class="stat-label">Status Code</div><div class="stat-value" style="font-size:2rem;">${project.liveStatus?.status_code || '—'}</div></div>
      <div class="stat-card"><div class="stat-label">Last Checked</div><div class="stat-value" style="font-size:1.2rem;">${project.liveStatus?.checked_at ? new Date(project.liveStatus.checked_at).toLocaleString() : '—'}</div></div>
    </div>
    <div class="chart-box" style="margin-top:1.5rem;">
      <h3>Response Time History</h3>
      <canvas id="lineChart"></canvas>
    </div>
    <button class="btn btn-primary" onclick="navigate('projects')"><i class="fas fa-arrow-left"></i> Back to Projects</button>
  `;

  const labels = history.map(h => new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const data = history.map(h => h.response_time_ms);
  const ctx = document.getElementById('lineChart').getContext('2d');
  charts.lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Response Time (ms)',
        data,
        borderColor: '#1e3a5f',
        backgroundColor: 'rgba(30,58,95,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: { responsive: true }
  });
}

// ---------- FINANCE ----------
async function renderFinance() {
  const [fin, projects] = await Promise.all([
    fetchJSON(`${API}/finance/sales`).catch(() => ({ total: 0, sales: [] })),
    fetchJSON(`${API}/projects`).catch(() => [])
  ]);

  const main = document.querySelector('.main-content');
  main.innerHTML = `
    <h1>Finance</h1>
    <div class="stat-card" style="display:inline-block; min-width:250px; margin-bottom:2rem;">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value" style="font-size:2rem;">${formatCurrency(fin.total)}</div>
    </div>
    <button class="btn btn-primary" id="showFormBtn"><i class="fas fa-plus"></i> Record Sale</button>
    <div id="saleForm" style="display:none; margin:1rem 0;" class="glass card">
      <select id="saleProject" class="input-modern"><option value="">Select project</option>${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      <input type="number" id="saleAmount" placeholder="Amount (KES)" class="input-modern" />
      <input type="text" id="saleNotes" placeholder="Notes" class="input-modern" />
      <button class="btn btn-success" id="saveSaleBtn"><i class="fas fa-check"></i> Save</button>
      <button class="btn btn-danger btn-sm" id="cancelSaleBtn"><i class="fas fa-times"></i> Cancel</button>
    </div>
    <div class="table-container">
      <table class="table-modern">
        <thead><tr><th>Project</th><th>Amount</th><th>Date</th><th>Notes</th><th></th></tr></thead>
        <tbody>${fin.sales.map(s => `
          <tr>
            <td>${s.project_name}</td>
            <td>${formatCurrency(s.amount)}</td>
            <td>${new Date(s.sale_date).toLocaleDateString()}</td>
            <td>${s.notes || '—'}</td>
            <td><button class="btn btn-danger btn-sm delete-sale" data-id="${s.id}"><i class="fas fa-trash"></i></button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;

  document.getElementById('showFormBtn').addEventListener('click', () => {
    document.getElementById('saleForm').style.display = 'block';
  });
  document.getElementById('cancelSaleBtn').addEventListener('click', () => {
    document.getElementById('saleForm').style.display = 'none';
  });
  document.getElementById('saveSaleBtn').addEventListener('click', async () => {
    const project_id = document.getElementById('saleProject').value;
    const amount = document.getElementById('saleAmount').value;
    const notes = document.getElementById('saleNotes').value;
    if (!project_id || !amount) return;
    await fetchJSON(`${API}/finance/sales`, {
      method: 'POST',
      body: JSON.stringify({ project_id: parseInt(project_id), amount: parseFloat(amount), notes })
    });
    navigate('finance');
  });
  document.querySelectorAll('.delete-sale').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Delete this record?')) {
        await fetchJSON(`${API}/finance/sales/${e.target.dataset.id}`, { method: 'DELETE' });
        navigate('finance');
      }
    });
  });
}

// ---------- ALERTS ----------
async function renderAlerts() {
  const downProjects = await fetchJSON(`${API}/uptime/status`).catch(() => []);
  const down = downProjects.filter(p => p.status === 'down');
  const main = document.querySelector('.main-content');
  main.innerHTML = `<h1>Down Projects</h1>`;
  if (down.length === 0) {
    main.innerHTML += `<div class="glass card" style="text-align:center; padding:2rem;"><i class="fas fa-check-circle" style="color:var(--success); margin-right:0.5rem;"></i> All systems operational</div>`;
  } else {
    main.innerHTML += down.map(p => `
      <div class="glass card" style="margin-bottom:1rem; border-left:4px solid var(--danger); display:flex; justify-content:space-between;">
        <div>
          <strong>Project #${p.project_id}</strong>
          <div style="color:var(--danger);">DOWN</div>
          <small>Last checked: ${new Date(p.checked_at).toLocaleString()}</small>
        </div>
        <span class="badge badge-down"><i class="fas fa-exclamation-triangle"></i> Offline</span>
      </div>
    `).join('');
  }
}

// ---------- LAYOUT ----------
function renderSidebar() {
  return `
    <div class="sidebar">
      <div class="sidebar-logo"><i class="fas fa-binoculars"></i> EagleVision</div>
      <nav>
        <a class="${currentPage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
        <a class="${currentPage === 'projects' ? 'active' : ''}" onclick="navigate('projects')"><i class="fas fa-folder"></i> Projects</a>
        <a class="${currentPage === 'finance' ? 'active' : ''}" onclick="navigate('finance')"><i class="fas fa-money-bill-wave"></i> Finance</a>
        <a class="${currentPage === 'alerts' ? 'active' : ''}" onclick="navigate('alerts')"><i class="fas fa-exclamation-circle"></i> Alerts</a>
      </nav>
      <button class="btn btn-danger logout-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
    </div>
    <div class="main-content"></div>
  `;
}

// ---------- APP INIT ----------
async function renderApp() {
  const loggedIn = await checkAuth();
  if (!loggedIn) {
    renderLogin();
    return;
  }

  document.getElementById('app').innerHTML = `<div class="dashboard-layout">${renderSidebar()}</div>`;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  switch (currentPage) {
    case 'dashboard': await renderDashboard(); break;
    case 'projects': await renderProjects(); break;
    case 'projectDetail': {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) await renderProjectDetail(id);
      else navigate('projects');
      break;
    }
    case 'finance': await renderFinance(); break;
    case 'alerts': await renderAlerts(); break;
    default: navigate('dashboard');
  }
}

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) currentPage = 'projectDetail';
  else currentPage = 'dashboard';
  renderApp();
});

renderApp();
