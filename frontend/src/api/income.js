import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

// ── Contrats salariaux ─────────────────────────────────────────
export const getSalaryContracts  = ()         => api.get('/api/salary-contracts').then(r => r.data)
export const getSalaryContract   = (id)       => api.get(`/api/salary-contracts/${id}`).then(r => r.data)
export const createSalaryContract = (data)    => api.post('/api/salary-contracts', data).then(r => r.data)
export const updateSalaryContract = (id, data) => api.put(`/api/salary-contracts/${id}`, data).then(r => r.data)
export const deleteSalaryContract = (id)      => api.delete(`/api/salary-contracts/${id}`)

// ── Bulletins de paie ──────────────────────────────────────────
export const getPaySlips    = (contractId)          => api.get(`/api/salary-contracts/${contractId}/pay-slips`).then(r => r.data)
export const createPaySlip  = (contractId, data)    => api.post(`/api/salary-contracts/${contractId}/pay-slips`, data).then(r => r.data)
export const updatePaySlip  = (contractId, id, data) => api.put(`/api/salary-contracts/${contractId}/pay-slips/${id}`, data).then(r => r.data)
export const deletePaySlip  = (contractId, id)      => api.delete(`/api/salary-contracts/${contractId}/pay-slips/${id}`)

// ── Revenus complémentaires ────────────────────────────────────
export const getOtherIncomes   = ()          => api.get('/api/other-incomes').then(r => r.data)
export const createOtherIncome = (data)      => api.post('/api/other-incomes', data).then(r => r.data)
export const updateOtherIncome = (id, data)  => api.put(`/api/other-incomes/${id}`, data).then(r => r.data)
export const deleteOtherIncome = (id)        => api.delete(`/api/other-incomes/${id}`)
