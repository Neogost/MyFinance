import axios from 'axios'
import { trackError as apiTrackError } from './analytics'

// xsrfCookieName et xsrfHeaderName matchent les valeurs par défaut de Spring Security
// (CookieCsrfTokenRepository.withHttpOnlyFalse()). Axios lit le cookie XSRF-TOKEN posé par
// le backend et ré-émet sa valeur dans l'en-tête X-XSRF-TOKEN sur toutes les requêtes
// non-GET — ce qui valide le double-submit cookie côté serveur.
const api = axios.create({
  baseURL:        '/',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

// Callbacks injectés par App.jsx au démarrage
let _onUnauthorized = null
let _onServerError  = null

export function setUnauthorizedHandler(fn) { _onUnauthorized = fn }
export function setServerErrorHandler(fn)  { _onServerError  = fn }

// Injecte X-Session-Id sur toutes les requêtes (corrélation analytics ↔ erreurs)
api.interceptors.request.use(config => {
  const sessionId = sessionStorage.getItem('analytics-session-id')
  if (sessionId) config.headers['X-Session-Id'] = sessionId
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    const url    = error.config?.url ?? ''
    const isLoginEndpoint = url.includes('/api/auth/login')
    const isAnalyticsEndpoint = url.includes('/api/analytics/')

    if (status === 401 && _onUnauthorized && !isLoginEndpoint && !isAnalyticsEndpoint) {
      _onUnauthorized()
    } else if (status >= 500 && _onServerError) {
      _onServerError(status)
    }

    // Log 5xx + 403 + 404 /api/* comme erreur frontend (sauf les endpoints analytics eux-mêmes)
    if (!isAnalyticsEndpoint && status) {
      const method = error.config?.method?.toUpperCase()
      if (status >= 500 || (status === 403 && url.startsWith('/api/')) || (status === 404 && url.startsWith('/api/'))) {
        apiTrackError(`HTTP_${status}`, `${method} ${url} → ${status}`, null, url)
      }
    }

    return Promise.reject(error)
  }
)

export default api
