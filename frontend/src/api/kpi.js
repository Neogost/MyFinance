import api from './client'

export const getKpiTargets = ()        => api.get('/api/patrimoine/kpi/targets').then(r => r.data)
export const saveKpiTargets = (payload) => api.put('/api/patrimoine/kpi/targets', payload).then(r => r.data)
export const getKpiValues  = ()        => api.get('/api/patrimoine/kpi/values').then(r => r.data)
