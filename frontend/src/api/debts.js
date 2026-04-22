import api from './client'

export const getDebts            = ()             => api.get('/api/debts').then(r => r.data)
export const getDebt             = (id)           => api.get(`/api/debts/${id}`).then(r => r.data)
export const getDebtsSummary     = ()             => api.get('/api/debts/summary').then(r => r.data)
export const createDebt          = (data)         => api.post('/api/debts', data).then(r => r.data)
export const updateDebt          = (id, data)     => api.put(`/api/debts/${id}`, data).then(r => r.data)
export const deleteDebt          = (id)           => api.delete(`/api/debts/${id}`)

export const getBalanceEntries   = (id)           => api.get(`/api/debts/${id}/balance-entries`).then(r => r.data)
export const addBalanceEntry     = (id, data)     => api.post(`/api/debts/${id}/balance-entries`, data).then(r => r.data)
export const deleteBalanceEntry  = (id, entryId)  => api.delete(`/api/debts/${id}/balance-entries/${entryId}`)
