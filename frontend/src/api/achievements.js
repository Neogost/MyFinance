import api from './client'

export const getMyAchievements = () =>
  api.get('/api/achievements/me').then(r => r.data)

export const markAchievementsSeen = () =>
  api.put('/api/achievements/me/seen')
