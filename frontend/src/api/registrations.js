import api from './client'

export const submitRegistration  = (data)         => api.post('/api/auth/register', data).then(r => r.data)
export const getRegistrations    = (status)        => api.get('/api/admin/registrations', { params: status ? { status } : {} }).then(r => r.data)
export const approveRegistration = (id)            => api.post(`/api/admin/registrations/${id}/approve`).then(r => r.data)
export const rejectRegistration  = (id)            => api.post(`/api/admin/registrations/${id}/reject`).then(r => r.data)
