import api from './client'

// ── Tableau de bord — données agrégées ────────────────────────────────────────
export const getSalaryEvolution  = () => api.get('/api/dashboard/salary-evolution').then(r => r.data)

// ── Rétrocompatibilité Palier 2 (dashboard par défaut) ────────────────────────
export const getDashboardLayout  = () => api.get('/api/dashboard/layout').then(r => r.data)
export const saveDashboardLayout = (layoutJson, version) =>
  api.put('/api/dashboard/layout', { layoutJson, version }).then(r => r.data)

// ── Palier 3 — Dashboards multiples ──────────────────────────────────────────
export const getDashboards     = () =>
  api.get('/api/dashboards').then(r => r.data)

export const getDashboard      = (id) =>
  api.get(`/api/dashboards/${id}`).then(r => r.data)

export const createDashboard   = (name) =>
  api.post('/api/dashboards', { name }).then(r => r.data)

export const updateDashboard   = (id, { name, sortOrder, isDefault }) =>
  api.put(`/api/dashboards/${id}`, { name, sortOrder, isDefault }).then(r => r.data)

export const saveDashboardLayoutV3 = (dashboardId, layoutJson, version) =>
  api.put(`/api/dashboards/${dashboardId}/layout`, { layoutJson, version }).then(r => r.data)

export const reorderDashboards = (orderedIds) =>
  api.put('/api/dashboards/reorder', { orderedIds }).then(r => r.data)

export const deleteDashboard   = (id) =>
  api.delete(`/api/dashboards/${id}`)
