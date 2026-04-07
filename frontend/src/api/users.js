import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

export const getUsers       = ()         => api.get('/api/users').then(r => r.data)
export const createUser     = (data)     => api.post('/api/users', data).then(r => r.data)
export const updateUser     = (id, data) => api.put(`/api/users/${id}`, data).then(r => r.data)
export const deleteUser     = (id)       => api.delete(`/api/users/${id}`)
export const changePassword = (data)     => api.put('/api/auth/password', data)
