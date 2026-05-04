import api from './client'

export const getGlobalPerformance = (from, to) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)
  const qs = params.toString()
  return api.get(`/api/patrimoine/performance${qs ? '?' + qs : ''}`).then(r => r.data)
}
