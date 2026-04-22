import axios from 'axios'

const api = axios.create({ baseURL: '/', withCredentials: true })

// Callbacks injectés par App.jsx au démarrage
let _onUnauthorized = null
let _onServerError  = null

export function setUnauthorizedHandler(fn) { _onUnauthorized = fn }
export function setServerErrorHandler(fn)  { _onServerError  = fn }

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status
    if (status === 401 && _onUnauthorized) {
      _onUnauthorized()
    } else if (status >= 500 && _onServerError) {
      _onServerError(status)
    }
    return Promise.reject(error)
  }
)

export default api
