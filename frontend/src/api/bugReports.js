import client from './client'

// ── Utilisateur ────────────────────────────────────────────────────
export const getBugReports = (params) =>
  client.get('/api/bug-reports', { params }).then(r => r.data)

export const getBugReport = (id) =>
  client.get(`/api/bug-reports/${id}`).then(r => r.data)

export const createBugReport = (data) =>
  client.post('/api/bug-reports', data).then(r => r.data)

export const voteBugReport = (id, voteType) =>
  client.put(`/api/bug-reports/${id}/vote`, { voteType }).then(r => r.data)

export const removeVoteBugReport = (id) =>
  client.delete(`/api/bug-reports/${id}/vote`).then(r => r.data)

export const commentBugReport = (id, content) =>
  client.post(`/api/bug-reports/${id}/comments`, { content }).then(r => r.data)

// ── Admin ──────────────────────────────────────────────────────────
export const getAdminBugReports = (params) =>
  client.get('/api/admin/bug-reports', { params }).then(r => r.data)

export const getAdminBugReport = (id) =>
  client.get(`/api/admin/bug-reports/${id}`).then(r => r.data)

export const patchBugReport = (id, data) =>
  client.patch(`/api/admin/bug-reports/${id}`, data).then(r => r.data)

export const deleteAdminBugReport = (id) =>
  client.delete(`/api/admin/bug-reports/${id}`)

export const getBugLogs = (id, window = 1) =>
  client.get(`/api/admin/bug-reports/${id}/logs`, { params: { window } }).then(r => r.data)
