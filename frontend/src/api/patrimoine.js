import api from './client'

// ── Instruments ────────────────────────────────────────────────

export const getInstruments            = (params = {}) => api.get('/api/instruments', { params }).then(r => r.data)
export const getInstrument             = (id)           => api.get(`/api/instruments/${id}`).then(r => r.data)
export const getInstrumentPriceHistory = (id, from, to) => {
  const params = {}
  if (from) params.from = from
  if (to)   params.to   = to
  return api.get(`/api/instruments/${id}/price-history`, { params }).then(r => r.data)
}
export const getInstrumentOrderMarkers = (id) =>
  api.get(`/api/instruments/${id}/order-markers`).then(r => r.data)
export const createInstrument        = (data)         => api.post('/api/instruments', data).then(r => r.data)
export const updateInstrument        = (id, data)     => api.put(`/api/instruments/${id}`, data).then(r => r.data)
export const getActiveInstruments      = ()                    => api.get('/api/instruments/active').then(r => r.data)
export const updateInstrumentPrices    = (updates)             => api.put('/api/instruments/prices', updates).then(r => r.data)
export const updateInstrumentStablePrice = (id, stablePrice)  => api.patch(`/api/instruments/${id}/stable-price`, { stablePrice }).then(r => r.data)

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

// ── Backfill historique (admin) ────────────────────────────────

export const backfillCryptoPrices    = (id)            => api.post(`/api/admin/instruments/${id}/backfill-prices`).then(r => r.data)
export const importBoursePrices      = (id, file)      => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/api/admin/instruments/${id}/import-prices`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}
export const backfillExchangeRate         = (currency, params = {}) =>
  api.post(`/api/admin/exchange-rates/${currency}/backfill`, null, { params }).then(r => r.data)
export const getPriceHistorySummary       = () => api.get('/api/admin/instruments/price-history-summary').then(r => r.data)
export const getExchangeRateHistorySummary  = () => api.get('/api/admin/exchange-rates/history-summary').then(r => r.data)
export const getExchangeRateCurrencyUsage   = (currency) => api.get(`/api/admin/exchange-rates/${currency}/usage`).then(r => r.data)
export const deleteExchangeRateCurrency     = (currency) => api.delete(`/api/admin/exchange-rates/${currency}`)
export const getExchangeRateHistory       = (currency, from, to) =>
  api.get(`/api/admin/exchange-rates/${currency}/history`, { params: { from, to } }).then(r => r.data)
export const upsertExchangeRateHistory    = (currency, date, rate) =>
  api.put(`/api/admin/exchange-rates/${currency}/history/${date}`, { rate }).then(r => r.data)
export const deleteExchangeRateHistory    = (currency, date) =>
  api.delete(`/api/admin/exchange-rates/${currency}/history/${date}`)

// ── Snapshots ──────────────────────────────────────────────────

export const getSnapshots       = ()          => api.get('/api/portfolio/snapshots').then(r => r.data)
export const getSnapshot        = (id)        => api.get(`/api/portfolio/snapshots/${id}`).then(r => r.data)
export const createSnapshot     = (data)      => api.post('/api/portfolio/snapshots', data).then(r => r.data)
export const recalculateSnapshot    = (id)    => api.put(`/api/portfolio/snapshots/${id}/recalculate`).then(r => r.data)
export const createSnapshotForAll   = (data)  => api.post('/api/portfolio/snapshots/all', data).then(r => r.data)

// ── Référentiel INSEE ──────────────────────────────────────────

export const getReferentiel = () => api.get('/api/patrimoine/referentiel').then(r => r.data)

// ── Stratégie & Objectifs ──────────────────────────────────────

export const getPatrimoineTargets  = ()        => api.get('/api/patrimoine/targets').then(r => r.data)
export const savePatrimoineTargets = (payload) => api.put('/api/patrimoine/targets', payload).then(r => r.data)
export const getBreakdown       = (dim, cat) => api.get(
  `/api/patrimoine/breakdown/${dim}${cat ? `?category=${cat}` : ''}`
).then(r => r.data)
// Alias rétro-compatible
export const getSectorBreakdown = ()         => getBreakdown('sector')

// ── Scoring patrimonial ────────────────────────────────────────

export const getPatrimoineScore = () => api.get('/api/patrimoine/score').then(r => r.data)

// ── Admin — Market Data ────────────────────────────────────────

export const runMarketDataUpdate  = () => api.post('/api/admin/market-data/run').then(r => r.data)
export const runAllocationUpdate          = () => api.post('/api/admin/allocations/run').then(r => r.data)
export const deleteInstrument                  = (id)          => api.delete(`/api/instruments/${id}`)
export const updateInstrumentAllocations       = (id, entries) => api.put(`/api/instruments/${id}/allocations`, entries).then(r => r.data)
export const updateInstrumentSectorAllocations = (id, entries) => api.put(`/api/instruments/${id}/sector-allocations`, entries).then(r => r.data)

// ── Admin — Snapshots ──────────────────────────────────────────

export const getAdminSnapshots       = (userId)       => api.get('/api/admin/snapshots', { params: { userId } }).then(r => r.data)
export const getAdminSnapshot        = (id)           => api.get(`/api/admin/snapshots/${id}`).then(r => r.data)
export const createAdminSnapshot     = (data)         => api.post('/api/admin/snapshots', data).then(r => r.data)
export const updateAdminSnapshot     = (id, data)     => api.put(`/api/admin/snapshots/${id}`, data).then(r => r.data)
export const deleteAdminSnapshot     = (id)           => api.delete(`/api/admin/snapshots/${id}`)
export const getAdminUserPositions   = (userId)       => api.get(`/api/admin/users/${userId}/positions`).then(r => r.data)

// ── Admin — Historique des cours ──────────────────────────────

export const getPriceHistory    = (id, from, to)     => api.get(`/api/admin/instruments/${id}/price-history`, { params: { from, to } }).then(r => r.data)
export const upsertPriceHistory = (id, date, price)  => api.put(`/api/admin/instruments/${id}/price-history/${date}`, { price }).then(r => r.data)
export const deletePriceHistory = (id, date)         => api.delete(`/api/admin/instruments/${id}/price-history/${date}`)
