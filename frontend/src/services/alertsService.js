import { api } from './api.js';

export const alertsService = {
  getAll: () => api('/api/alerts'),
  getUnacknowledged: () => api('/api/alerts?acknowledged=false'),
  acknowledge: (id) => api(`/api/alerts/${id}/acknowledge`, { method: 'POST' }),
};
