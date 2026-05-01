import api from './client'

export const getDataSummary = () =>
  api.get('/api/profile/data-summary').then(r => r.data)

export const deleteAllData = () =>
  api.delete('/api/profile/data')

export const deleteDataOnly = () =>
  api.delete('/api/profile/data-only')
