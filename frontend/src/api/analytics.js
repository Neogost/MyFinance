import api from './client'

// Fire-and-forget : on ignore les erreurs (rate-limit 429, body trop long 400…)
// car le tracking ne doit jamais perturber l'UX. Le client Axios gère le CSRF,
// l'en-tête X-Session-Id (via intercepteur de requête) et `withCredentials`.

export const trackEvent = (type, name, page, metadata) =>
  api.post('/api/analytics/track', { type, name, page, metadata }).catch(() => {})

export const trackError = (errorType, message, stack, requestPath, metadata) =>
  api.post('/api/analytics/error', { errorType, message, stack, requestPath, metadata }).catch(() => {})

// ── Opt-out ────────────────────────────────────────────────

export const updateAnalyticsOptOut = (optOut) =>
  api.put('/api/profile/analytics-opt-out', null, { params: { optOut } }).then(r => r.data)

// ── Endpoints admin ────────────────────────────────────────

export const getEngagementSummary = (params) =>
  api.get('/api/admin/analytics/engagement-summary', { params }).then(r => r.data)

export const getRetention = (params) =>
  api.get('/api/admin/analytics/retention', { params }).then(r => r.data)

export const getTopEvents = (params) =>
  api.get('/api/admin/analytics/top-events', { params }).then(r => r.data)

export const getTimeline = (params) =>
  api.get('/api/admin/analytics/timeline', { params }).then(r => r.data)

export const getJourney = (sessionId) =>
  api.get(`/api/admin/analytics/journey/${sessionId}`).then(r => r.data)

export const getJourneyErrors = (sessionId) =>
  api.get(`/api/admin/analytics/journey/${sessionId}/errors`).then(r => r.data)

export const getErrors = (params) =>
  api.get('/api/admin/analytics/errors', { params }).then(r => r.data)

export const getErrorOccurrences = (fingerprint, params) =>
  api.get(`/api/admin/analytics/errors/${fingerprint}`, { params }).then(r => r.data)

export const getHealth = (params) =>
  api.get('/api/admin/analytics/health', { params }).then(r => r.data)

export const purgeAnalytics = (params) =>
  api.delete('/api/admin/analytics/purge', { params }).then(r => r.data)
