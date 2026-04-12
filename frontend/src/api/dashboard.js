import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

// ── Tableau de bord ────────────────────────────────────────────
export const getSalaryEvolution = () => api.get('/api/dashboard/salary-evolution').then(r => r.data)
