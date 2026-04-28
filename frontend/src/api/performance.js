import api from './client'

export const getPerformanceGlobal = (params = {}) =>
  api.get('/api/patrimoine/performance', { params }).then(r => r.data)

export const getPerformancePositions = (params = {}) =>
  api.get('/api/patrimoine/performance/positions', { params }).then(r => r.data)

export const getPerformancePosition = (id, params = {}) =>
  api.get(`/api/patrimoine/performance/positions/${id}`, { params }).then(r => r.data)
