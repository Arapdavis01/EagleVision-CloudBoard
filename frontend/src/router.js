import { loginPage } from './pages/login/login.js';
import { dashboardPage } from './pages/dashboard/dashboard.js';
import { projectsPage } from './pages/projects/projects.js';
import { financePage } from './pages/finance/finance.js';
import { alertsPage } from './pages/alerts/alerts.js';
import { showcasePage } from './pages/showcase/showcase.js';
import { serviceRecordPage } from './pages/serviceRecord/serviceRecord.js';
import { servicePlannerPage } from './pages/servicePlanner/servicePlanner.js';
import { approveLoginPage } from './pages/approveLogin/approveLogin.js';

const routes = {
  '#login': loginPage,
  '#dashboard': dashboardPage,
  '#projects': projectsPage,
  '#finance': financePage,
  '#alerts': alertsPage,
  '#showcase': showcasePage,
  '#service-planner': servicePlannerPage,
  '#service-record': serviceRecordPage,
  '#approve-login': approveLoginPage,
};

export async function initRouter() {
  // Split on '?' to ignore query strings in the hash (e.g., #projects?filter=all)
  const fullHash = location.hash || '#login';
  const baseHash = fullHash.split('?')[0];

  const pageLoader = routes[baseHash];
  if (pageLoader) {
    try {
      await pageLoader();
    } catch (err) {
      console.error('Page load error:', err);
      document.getElementById('app').innerHTML = '<p>Error loading page.</p>';
    }
  } else {
    document.getElementById('app').innerHTML = '<p>Page not found.</p>';
  }
}

window.addEventListener('hashchange', initRouter);
