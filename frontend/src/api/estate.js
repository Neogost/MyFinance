import api from './client'

// ── Cellule familiale ──────────────────────────────────────
export const getFamilyMembers    = ()          => api.get('/api/family-members').then(r => r.data)
export const createFamilyMember  = (data)      => api.post('/api/family-members', data).then(r => r.data)
export const updateFamilyMember  = (id, data)  => api.put(`/api/family-members/${id}`, data).then(r => r.data)
export const deleteFamilyMember  = (id)        => api.delete(`/api/family-members/${id}`)

// ── Simulation de donation ─────────────────────────────────
export const simulateDonation      = (data) => api.post('/api/estate/donation/simulate', data).then(r => r.data)
export const simulateJointDonation = (data) => api.post('/api/estate/donation/simulate-joint', data).then(r => r.data)
export const simulateMultiRecipientDonation = (data) => api.post('/api/estate/donation/simulate-multi', data).then(r => r.data)
export const simulateJointMultiRecipientDonation = (data) => api.post('/api/estate/donation/simulate-joint-multi', data).then(r => r.data)

// ── Simulation de succession (V2) ──────────────────────────
export const simulateSuccession = () => api.get('/api/estate/succession/simulate').then(r => r.data)

// ── Stratégie 15 ans (V3) ──────────────────────────────────
export const simulateStrategy = () => api.get('/api/estate/strategy/simulate').then(r => r.data)

// ── Donations passées ──────────────────────────────────────
export const getPastDonations    = ()          => api.get('/api/estate/past-donations').then(r => r.data)
export const recordPastDonation  = (data)      => api.post('/api/estate/past-donations', data).then(r => r.data)
export const deletePastDonation  = (id)        => api.delete(`/api/estate/past-donations/${id}`)
