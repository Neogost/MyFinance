import api from './client'

export async function login(username, password) {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)

  const { data } = await api.post('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function logout() {
  await api.post('/api/auth/logout')
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me')
  return data
}
