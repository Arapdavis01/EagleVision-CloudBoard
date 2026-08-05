const API = 'https://eaglevision-api.onrender.com/api';

// Simple SPA routing
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="glass card">
      <h2 style="font-size:1.8rem; text-align:center; margin-bottom:1.5rem; color:var(--primary);">🦅 EagleVision</h2>
      <form id="loginForm">
        <label>Email</label>
        <input type="email" class="input" id="email" required />
        <label style="display:block; margin-top:1rem;">Password</label>
        <input type="password" class="input" id="password" required />
        <div id="loginError" class="error"></div>
        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1.5rem;">Sign In</button>
      </form>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      window.location.reload();
    } catch (err) {
      document.getElementById('loginError').textContent = err.message;
    }
  });
}

async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth/check`, { credentials: 'include' });
    return res.ok;
  } catch { return false; }
}

(async () => {
  const loggedIn = await checkAuth();
  if (loggedIn) {
    // For now just show a simple dashboard placeholder – you can expand later
    document.getElementById('app').innerHTML = `
      <div class="glass" style="padding:2rem; max-width:800px; margin:0 auto;">
        <h1 style="color:var(--primary);">Dashboard</h1>
        <p>You are logged in. Modern dashboard coming soon.</p>
        <button class="btn btn-primary" id="logoutBtn">Sign Out</button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.reload();
    });
  } else {
    renderLogin();
  }
})();
