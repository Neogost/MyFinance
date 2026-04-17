import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

// ── Dépenses récurrentes ───────────────────────────────────────
export const getExpenses      = ()          => api.get('/api/recurring-expenses').then(r => r.data)
export const getExpenseSummary = ()         => api.get('/api/recurring-expenses/summary').then(r => r.data)
export const createExpense    = (data)      => api.post('/api/recurring-expenses', data).then(r => r.data)
export const updateExpense    = (id, data)  => api.put(`/api/recurring-expenses/${id}`, data).then(r => r.data)
export const deleteExpense    = (id)        => api.delete(`/api/recurring-expenses/${id}`)
