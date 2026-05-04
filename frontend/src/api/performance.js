import api from './client'

export const getGlobalPerformance = () =>
  api.get('/api/patrimoine/performance').then(r => r.data)
