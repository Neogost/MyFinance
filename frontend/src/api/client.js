import axios from 'axios'

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

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    const isLoginEndpoint = error.config?.url?.includes('/api/auth/login')
    if (status === 401 && _onUnauthorized && !isLoginEndpoint) {
      _onUnauthorized()
    } else if (status >= 500 && _onServerError) {
      _onServerError(status)
    }
    return Promise.reject(error)
  }
)

export default api
