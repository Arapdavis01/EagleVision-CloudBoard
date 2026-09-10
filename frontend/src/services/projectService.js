import { api } from './api.js';

export const projectService = {
  // ==================== BASIC PROJECT CRUD ====================
  
  getAll: (search = '') =>
    api(`/api/projects?search=${encodeURIComponent(search)}`),
  
  getOne: (id) =>
    api(`/api/projects/${id}`),
  
  create: (data) =>
    api('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  
  update: (id, data) =>
    api(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  delete: (id) =>
    api(`/api/projects/${id}`, { method: 'DELETE' }),

  // ==================== SERVICE RECORD (PROJECT UPDATES) ====================
  
  // Get updates with optional sorting
  getUpdates: (projectId, sort = '') => {
    const params = sort ? `?sort=${encodeURIComponent(sort)}` : '';
    return api(`/api/projects/${projectId}/updates${params}`);
  },
  
  createUpdate: (projectId, data) =>
    api(`/api/projects/${projectId}/updates`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  updateUpdate: (id, data) =>
    api(`/api/projects/updates/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  deleteUpdate: (id) =>
    api(`/api/projects/updates/${id}`, { method: 'DELETE' }),

  // ==================== COMBINED REVIEW & UPDATE ====================
  
  reviewAndUpdate: (projectId, data) =>
    api(`/api/projects/${projectId}/review-and-update`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),

  // ==================== PROJECT HEALTH SCORE ====================
  
  // Get project health score and metrics
  getHealth: (projectId) =>
    api(`/api/projects/${projectId}/health`),

  // ==================== PROJECT COST ANALYTICS ====================
  
  // Get cost analytics for a project
  getCostAnalytics: (projectId, months = 6) =>
    api(`/api/projects/${projectId}/cost-analytics?months=${months}`),

  // ==================== BULK OPERATIONS (OPTIONAL) ====================
  
  // Get multiple projects by IDs (helper)
  getMany: async (ids) => {
    if (!ids || ids.length === 0) return [];
    const projects = await projectService.getAll();
    return projects.filter(p => ids.includes(p.id));
  },
};
