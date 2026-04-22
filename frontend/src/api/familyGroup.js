import api from './client'

export const getMyGroup            = ()         => api.get('/api/family-groups/my').then(r => r.status === 204 ? null : r.data)
export const getMyGroupMembers     = ()         => api.get('/api/family-groups/my/members').then(r => r.data)
export const getMemberPositions    = (memberId) => api.get(`/api/family-groups/my/members/${memberId}/positions`).then(r => r.data)
export const createGroup           = (data)     => api.post('/api/family-groups', data).then(r => r.data)
export const renameGroup           = (data)     => api.put('/api/family-groups/my', data).then(r => r.data)
export const dissolveGroup         = ()         => api.delete('/api/family-groups/my')
export const leaveGroup            = ()         => api.delete('/api/family-groups/my/leave')
export const removeMember          = (memberId) => api.delete(`/api/family-groups/my/members/${memberId}`)
export const sendInvitation        = (data)     => api.post('/api/family-groups/my/invitations', data).then(r => r.data)
export const getPendingInvitations = ()         => api.get('/api/family-groups/invitations/pending').then(r => r.data)
export const acceptInvitation      = (id)       => api.post(`/api/family-groups/invitations/${id}/accept`).then(r => r.data)
export const refuseInvitation      = (id)       => api.post(`/api/family-groups/invitations/${id}/refuse`)

export const adminGetAllGroups     = ()         => api.get('/api/admin/family-groups').then(r => r.data)
export const adminGetGroup         = (id)       => api.get(`/api/admin/family-groups/${id}`).then(r => r.data)
export const adminDissolveGroup    = (id)       => api.delete(`/api/admin/family-groups/${id}`)
export const adminRemoveMember     = (groupId, memberId) => api.delete(`/api/admin/family-groups/${groupId}/members/${memberId}`)
