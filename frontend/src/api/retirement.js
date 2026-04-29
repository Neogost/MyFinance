import api from './client'

export const getRetirementParameters = () =>
  api.get('/api/retirement/parameters').then(r => r.data)
