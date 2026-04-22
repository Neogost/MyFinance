import api from './client'

export const getPossessions        = ()         => api.get('/api/possessions').then(r => r.data)
export const getPossession         = (id)       => api.get(`/api/possessions/${id}`).then(r => r.data)
export const getPossessionsSummary = ()         => api.get('/api/possessions/summary').then(r => r.data)
export const createPossession      = (data)     => api.post('/api/possessions', data).then(r => r.data)
export const updatePossession      = (id, data) => api.put(`/api/possessions/${id}`, data).then(r => r.data)
export const deletePossession      = (id)       => api.delete(`/api/possessions/${id}`)
