import client from './client'

export const getActiveBanners = () =>
  client.get('/api/info-banners/active').then(r => r.data)

export const getAdminBanners = () =>
  client.get('/api/admin/info-banners').then(r => r.data)

export const getAdminBanner = (id) =>
  client.get(`/api/admin/info-banners/${id}`).then(r => r.data)

export const createBanner = (data) =>
  client.post('/api/admin/info-banners', data).then(r => r.data)

export const updateBanner = (id, data) =>
  client.put(`/api/admin/info-banners/${id}`, data).then(r => r.data)

export const deleteBanner = (id) =>
  client.delete(`/api/admin/info-banners/${id}`)
