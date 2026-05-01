import { useState } from 'react'
import { updateAnalyticsOptOut } from '../../api/analytics'

export default function AnalyticsOptOutPanel({ user, onUpdate }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleToggle() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateAnalyticsOptOut(!user.analyticsOptOut)
      sessionStorage.setItem('analytics-opt-out', String(updated.analyticsOptOut))
      onUpdate(updated)
    } catch {
      setError('Impossible de mettre à jour la préférence.')
    } finally {
      setSaving(false)
    }
  }

  const optOut = user?.analyticsOptOut ?? false

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Suivi de l'usage</h2>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-700">
            {optOut
              ? 'Le suivi de votre usage est désactivé. Aucun événement de navigation ne sera enregistré.'
              : 'Le suivi de votre usage est actif. Il aide à améliorer les fonctionnalités de l\'application.'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Les erreurs techniques restent toujours capturées pour assurer la stabilité de l'application.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            optOut ? 'bg-gray-300' : 'bg-indigo-600'
          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={optOut ? 'Activer le suivi' : 'Désactiver le suivi'}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            optOut ? 'translate-x-1' : 'translate-x-6'
          }`} />
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
