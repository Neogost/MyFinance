import client from './client'

export const getLoginHistory = (params) =>
  client.get('/api/admin/login-history', { params }).then(r => r.data)
