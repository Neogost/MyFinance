import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

// ── Instruments ────────────────────────────────────────────────

export const getInstruments          = (params = {}) => api.get('/api/instruments', { params }).then(r => r.data)
export const getInstrument           = (id)           => api.get(`/api/instruments/${id}`).then(r => r.data)
export const createInstrument        = (data)         => api.post('/api/instruments', data).then(r => r.data)
export const updateInstrument        = (id, data)     => api.put(`/api/instruments/${id}`, data).then(r => r.data)
export const getActiveInstruments    = ()             => api.get('/api/instruments/active').then(r => r.data)
export const updateInstrumentPrices  = (updates)      => api.put('/api/instruments/prices', updates).then(r => r.data)

// ── Positions ──────────────────────────────────────────────────

export const getPositions         = (params = {}) => api.get('/api/positions', { params }).then(r => r.data)
export const getPosition          = (id)          => api.get(`/api/positions/${id}`).then(r => r.data)
export const createPosition       = (data)        => api.post('/api/positions', data).then(r => r.data)
export const updatePosition       = (id, data)    => api.put(`/api/positions/${id}`, data).then(r => r.data)
export const updateBalance        = (id, data)    => api.put(`/api/positions/${id}/balance`, data).then(r => r.data)
export const updateEstimatedValue = (id, data)    => api.put(`/api/positions/${id}/estimated-value`, data).then(r => r.data)
export const closePosition        = (id)          => api.put(`/api/positions/${id}/close`).then(r => r.data)
export const deletePosition       = (id)          => api.delete(`/api/positions/${id}`)

// ── Ordres ─────────────────────────────────────────────────────

export const getOrders    = (positionId)           => api.get(`/api/positions/${positionId}/orders`).then(r => r.data)
export const createOrder  = (positionId, data)     => api.post(`/api/positions/${positionId}/orders`, data).then(r => r.data)
export const updateOrder  = (positionId, id, data) => api.put(`/api/positions/${positionId}/orders/${id}`, data).then(r => r.data)
export const deleteOrder  = (positionId, id)       => api.delete(`/api/positions/${positionId}/orders/${id}`)

// ── Taux de change ─────────────────────────────────────────

export const getExchangeRates    = ()        => api.get('/api/exchange-rates').then(r => r.data)
export const updateExchangeRates = (updates) => api.put('/api/exchange-rates', updates).then(r => r.data)

// ── Snapshots ──────────────────────────────────────────────────

export const getSnapshots       = ()          => api.get('/api/portfolio/snapshots').then(r => r.data)
export const getSnapshot        = (id)        => api.get(`/api/portfolio/snapshots/${id}`).then(r => r.data)
export const createSnapshot     = (data)      => api.post('/api/portfolio/snapshots', data).then(r => r.data)
export const recalculateSnapshot = (id)       => api.put(`/api/portfolio/snapshots/${id}/recalculate`).then(r => r.data)
