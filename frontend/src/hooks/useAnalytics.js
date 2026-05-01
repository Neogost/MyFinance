import { useCallback } from 'react'
import { trackEvent as apiTrack, trackError as apiError } from '../api/analytics'

const ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'

function getSessionId() {
  return sessionStorage.getItem('analytics-session-id')
}

function isOptOut() {
  return sessionStorage.getItem('analytics-opt-out') === 'true'
}

/**
 * Hook principal d'analytics. Fire-and-forget : aucune erreur ne remonte au composant.
 * Convention event_name : module.feature.action (3 segments, snake_case)
 * trackPageView(page) envoie module.feature.view — le ".view" est ajouté automatiquement.
 */
export function useAnalytics() {
  const trackEvent = useCallback((type, name, metadata = null, pageName = null) => {
    if (!ENABLED || isOptOut()) return
    const sessionId = getSessionId()
    const page = pageName ?? (typeof window !== 'undefined' ? window.location.hash.slice(1) || 'dashboard' : null)
    apiTrack(type, name, page, metadata ? JSON.stringify(metadata) : null)
  }, [])

  const trackPageView = useCallback((moduleFeature) => {
    trackEvent('PAGE_VIEW', `${moduleFeature}.view`)
  }, [trackEvent])

  return { trackEvent, trackPageView }
}

/**
 * Utilisable hors hook React (ErrorBoundary classe, intercepteurs).
 */
export function logFrontendError(errorType, message, stack, requestPath) {
  if (!ENABLED) return
  apiError(errorType, message, stack, requestPath, null)
}
