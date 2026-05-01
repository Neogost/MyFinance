import { useState } from 'react'
import { updateAnalyticsOptOut } from '../../api/analytics'

const TRACKED_ACTIONS = [
  { icon: '📄', label: 'Pages visitées',       detail: 'Quelles sections de l\'application sont consultées' },
  { icon: '✅', label: 'Actions effectuées',   detail: 'Créations, modifications, suppressions de données (sans les valeurs)' },
  { icon: '🖱', label: 'Boutons cliqués',       detail: 'Ouverture de formulaires, toggles (mode nuit, masquer valeurs…)' },
  { icon: '📝', label: 'Formulaires soumis',   detail: 'Mise à jour du profil, changement de mot de passe' },
]

export default function AnalyticsOptOutPanel({ user, onUpdate }) {
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [details, setDetails] = useState(false)

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Suivi de l'usage</h2>
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

      <p className="text-sm text-gray-600 mb-3">
        {optOut
          ? 'Le suivi est désactivé — aucun événement de navigation n\'est enregistré.'
          : 'Le suivi est actif — il permet d\'identifier les fonctionnalités les plus utilisées pour orienter les améliorations.'}
      </p>

      {/* Types d'actions suivies */}
      <div className="rounded-lg border border-gray-100 overflow-hidden mb-3">
        <button
          onClick={() => setDetails(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition text-left"
        >
          <span>Quels types d'actions sont {optOut ? 'seraient' : 'sont'} suivies ?</span>
          <span className="text-gray-400">{details ? '▲' : '▼'}</span>
        </button>
        {details && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {TRACKED_ACTIONS.map(a => (
              <div key={a.label} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-base shrink-0 mt-0.5">{a.icon}</span>
                <div>
                  <p className="text-xs font-medium text-gray-700">{a.label}</p>
                  <p className="text-xs text-gray-400">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ce qui n'est jamais suivi */}
      <div className="flex items-start gap-2 text-xs text-gray-400">
        <span className="text-green-500 shrink-0 mt-0.5">🔒</span>
        <span>
          Les <strong className="text-gray-500">montants, prix, salaires et données personnelles</strong> ne sont jamais enregistrés.
          Les <strong className="text-gray-500">erreurs techniques</strong> sont toujours capturées indépendamment de ce réglage.
        </span>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
