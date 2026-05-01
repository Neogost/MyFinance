import api from './client'

// ── Fire-and-forget (fetch natif — pas de circular dep avec client.js) ────────

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function fireAndForget(path, body) {
  const sessionId = sessionStorage.getItem('analytics-session-id')
  const csrfToken = getCsrfToken()
  fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId  ? { 'X-Session-Id':   sessionId  } : {}),
      ...(csrfToken  ? { 'X-XSRF-TOKEN':   csrfToken  } : {}),
    },
    body: JSON.stringify(body),
  }).catch(() => {})
}

// ── Tracking côté client ───────────────────────────────────

export const trackEvent = (type, name, page, metadata) =>
  fireAndForget('/api/analytics/track', { type, name, page, metadata })

export const trackError = (errorType, message, stack, requestPath, metadata) =>
  fireAndForget('/api/analytics/error', { errorType, message, stack, requestPath, metadata })

// ── Opt-out ────────────────────────────────────────────────

export const updateAnalyticsOptOut = (optOut) =>
  api.put('/api/profile/analytics-opt-out', null, { params: { optOut } }).then(r => r.data)

// ── Endpoints admin ────────────────────────────────────────

export const getTopEvents = (params) =>
  api.get('/api/admin/analytics/top-events', { params }).then(r => r.data)

export const getTimeline = (params) =>
  api.get('/api/admin/analytics/timeline', { params }).then(r => r.data)

export const getJourney = (sessionId) =>
  api.get(`/api/admin/analytics/journey/${sessionId}`).then(r => r.data)

export const getErrors = (params) =>
  api.get('/api/admin/analytics/errors', { params }).then(r => r.data)

export const getErrorOccurrences = (fingerprint, params) =>
  api.get(`/api/admin/analytics/errors/${fingerprint}`, { params }).then(r => r.data)

export const getHealth = (params) =>
  api.get('/api/admin/analytics/health', { params }).then(r => r.data)

export const purgeAnalytics = (params) =>
  api.delete('/api/admin/analytics/purge', { params }).then(r => r.data)
