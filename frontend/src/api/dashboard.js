import api from './client'

// ── Tableau de bord ────────────────────────────────────────────
export const getSalaryEvolution  = () => api.get('/api/dashboard/salary-evolution').then(r => r.data)
export const getDashboardLayout  = () => api.get('/api/dashboard/layout').then(r => r.data)
export const saveDashboardLayout = (layoutJson, version) =>
  api.put('/api/dashboard/layout', { layoutJson, version }).then(r => r.data)
