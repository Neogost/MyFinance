import api from './client'

// ── Tableau de bord ────────────────────────────────────────────
export const getSalaryEvolution = () => api.get('/api/dashboard/salary-evolution').then(r => r.data)
