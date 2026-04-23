import api from './client'

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

// ── Primes ─────────────────────────────────────────────────────
export const getBonuses    = (contractId)           => api.get(`/api/salary-contracts/${contractId}/bonuses`).then(r => r.data)
export const createBonus   = (contractId, data)     => api.post(`/api/salary-contracts/${contractId}/bonuses`, data).then(r => r.data)
export const updateBonus   = (contractId, id, data) => api.put(`/api/salary-contracts/${contractId}/bonuses/${id}`, data).then(r => r.data)
export const deleteBonus   = (contractId, id)       => api.delete(`/api/salary-contracts/${contractId}/bonuses/${id}`)

// ── Avantages en nature ────────────────────────────────────────
export const getBenefits    = (contractId)           => api.get(`/api/salary-contracts/${contractId}/benefits`).then(r => r.data)
export const createBenefit  = (contractId, data)     => api.post(`/api/salary-contracts/${contractId}/benefits`, data).then(r => r.data)
export const updateBenefit  = (contractId, id, data) => api.put(`/api/salary-contracts/${contractId}/benefits/${id}`, data).then(r => r.data)
export const deleteBenefit  = (contractId, id)       => api.delete(`/api/salary-contracts/${contractId}/benefits/${id}`)

// ── Astreintes ─────────────────────────────────────────────────
export const getOnCalls    = (contractId)           => api.get(`/api/salary-contracts/${contractId}/on-calls`).then(r => r.data)
export const createOnCall  = (contractId, data)     => api.post(`/api/salary-contracts/${contractId}/on-calls`, data).then(r => r.data)
export const updateOnCall  = (contractId, id, data) => api.put(`/api/salary-contracts/${contractId}/on-calls/${id}`, data).then(r => r.data)
export const deleteOnCall  = (contractId, id)       => api.delete(`/api/salary-contracts/${contractId}/on-calls/${id}`)

// ── Révisions salariales ───────────────────────────────────────
export const getRevisions    = (contractId)           => api.get(`/api/salary-contracts/${contractId}/revisions`).then(r => r.data)
export const createRevision  = (contractId, data)     => api.post(`/api/salary-contracts/${contractId}/revisions`, data).then(r => r.data)
export const updateRevision  = (contractId, id, data) => api.put(`/api/salary-contracts/${contractId}/revisions/${id}`, data).then(r => r.data)
export const deleteRevision  = (contractId, id)       => api.delete(`/api/salary-contracts/${contractId}/revisions/${id}`)

// ── Revenus complémentaires ────────────────────────────────────
export const getOtherIncomes   = ()          => api.get('/api/other-incomes').then(r => r.data)
export const createOtherIncome = (data)      => api.post('/api/other-incomes', data).then(r => r.data)
export const updateOtherIncome = (id, data)  => api.put(`/api/other-incomes/${id}`, data).then(r => r.data)
export const deleteOtherIncome = (id)        => api.delete(`/api/other-incomes/${id}`)
