import api from './client'

export const getGlobalPerformance = (from, to) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)
  const qs = params.toString()
  return api.get(`/api/patrimoine/performance${qs ? '?' + qs : ''}`).then(r => r.data)
}

export const getBenchmarkPerformance = (instrumentId, from, to) => {
  const params = new URLSearchParams({ instrumentId })
  if (from) params.set('from', from)
  if (to)   params.set('to', to)
  return api.get(`/api/patrimoine/performance/benchmark?${params}`).then(r => r.data)
}
