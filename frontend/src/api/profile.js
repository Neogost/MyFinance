import api from './client'

export const getDataSummary = () =>
  api.get('/api/profile/data-summary').then(r => r.data)

export const deleteAllData = (currentPassword) =>
  api.delete('/api/profile/data', { data: { currentPassword } })

export const deleteDataOnly = (currentPassword) =>
  api.delete('/api/profile/data-only', { data: { currentPassword } })
