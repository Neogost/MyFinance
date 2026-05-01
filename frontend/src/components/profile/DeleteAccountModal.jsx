import { useState } from 'react'
import { createPortal } from 'react-dom'
import { getDataSummary, deleteAllData, deleteDataOnly } from '../../api/profile'
import { logout } from '../../api/auth'
import { useAnalytics } from '../../hooks/useAnalytics'

const CATEGORIES = [
  { key: 'salaryContracts',    label: 'Contrats salariaux',              detail: '(avec bulletins, primes, avantages, astreintes et révisions)' },
  { key: 'otherIncomes',       label: 'Revenus complémentaires',          detail: '' },
  { key: 'recurringExpenses',  label: 'Dépenses récurrentes',             detail: '' },
  { key: 'positions',          label: 'Positions patrimoniales',           detail: '(avec tous les ordres associés)' },
  { key: 'portfolioSnapshots', label: 'Relevés de patrimoine',             detail: '' },
  { key: 'debts',              label: 'Dettes',                            detail: '(avec l\'historique des mises à jour de capital)' },
  { key: 'possessions',        label: 'Possessions',                       detail: '' },
  { key: 'loanSimulations',    label: 'Simulations d\'emprunt sauvegardées', detail: '' },
  { key: 'patrimoineTargets',  label: 'Objectifs patrimoniaux',            detail: '' },
  { key: 'analyticsEvents',    label: 'Historique de navigation',          detail: '(events analytics)' },
]

// mode: 'account' (supprime données + compte) | 'data-only' (supprime données uniquement)
export default function DeleteAccountModal({ user, onClose, onDeleted, mode = 'account' }) {
  const { trackEvent } = useAnalytics()
  const [step,        setStep]        = useState(1)          // 1 = résumé, 2 = confirmation finale
  const [summary,     setSummary]     = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [understood,  setUnderstood]  = useState(false)
  const [loginInput,  setLoginInput]  = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const [error,       setError]       = useState(null)

  async function openStep1() {
    setLoadingSummary(true)
    setError(null)
    try {
      const s = await getDataSummary()
      setSummary(s)
      setStep(1)
    } catch {
      setError('Impossible de charger le résumé de vos données.')
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleDelete() {
    if (loginInput.trim() !== user.login) return
    setDeleting(true)
    setError(null)
    try {
      if (mode === 'data-only') {
        await deleteDataOnly()
        trackEvent('FEATURE_USE', 'auth.profile.data_deleted')
        onDeleted()
      } else {
        await deleteAllData()
        trackEvent('FEATURE_USE', 'auth.profile.account_deleted')
        await logout().catch(() => {})
        onDeleted()
      }
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez l\'administrateur.')
      setDeleting(false)
    }
  }

  const totalItems = summary
    ? CATEGORIES.reduce((s, c) => s + (summary[c.key] ?? 0), 0)
    : 0

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={!deleting ? onClose : undefined} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <h3 className="font-semibold text-gray-900">
              {step === 1
                ? (mode === 'data-only' ? 'Supprimer uniquement mes données' : 'Supprimer mon compte et mes données')
                : 'Confirmation finale'}
            </h3>
          </div>
          {!deleting && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Étape 1 : résumé des données ─────────────────── */}
          {step === 1 && (
            <>
              <p className="text-sm text-gray-600">
                {mode === 'data-only'
                  ? <>Cette action supprimera <strong>définitivement</strong> l'ensemble de vos données. Votre compte sera <strong>conservé</strong> et vous pourrez continuer à vous connecter. Elle est <strong>irréversible</strong>.</>
                  : <>Cette action supprimera <strong>définitivement</strong> votre compte et l'ensemble de vos données. Elle est <strong>irréversible</strong>.</>
                }
              </p>

              {/* Chargement du résumé */}
              {!summary && !loadingSummary && (
                <button
                  onClick={openStep1}
                  className="w-full py-2.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
                >
                  Voir ce qui sera supprimé
                </button>
              )}
              {loadingSummary && (
                <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
              )}

              {/* Liste des données */}
              {summary && (
                <div className="rounded-lg border border-red-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                      {totalItems} élément{totalItems !== 1 ? 's' : ''} seront supprimés
                      {mode === 'data-only' && <span className="normal-case font-normal ml-1">(compte conservé)</span>}
                    </p>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {CATEGORIES.filter(c => (summary[c.key] ?? 0) > 0).map(c => (
                      <li key={c.key} className="flex items-start justify-between px-4 py-2.5 gap-3">
                        <div className="min-w-0">
                          <span className="text-sm text-gray-700 font-medium">{c.label}</span>
                          {c.detail && <span className="text-xs text-gray-400 ml-1">{c.detail}</span>}
                        </div>
                        <span className="text-sm font-bold text-red-600 shrink-0">
                          {summary[c.key]}
                        </span>
                      </li>
                    ))}
                    {/* Compte utilisateur uniquement si suppression totale */}
                    {mode === 'account' && (
                      <li className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-700 font-medium">Compte utilisateur</span>
                        <span className="text-sm font-bold text-red-600">1</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Checkbox de compréhension */}
              {summary && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={e => setUnderstood(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-600">
                    Je comprends que cette action est <strong>irréversible</strong> et qu'aucune récupération ne sera possible.
                  </span>
                </label>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}

          {/* ── Étape 2 : confirmation par identifiant ──────── */}
          {step === 2 && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 space-y-1">
                <p className="font-semibold">Dernière confirmation requise.</p>
                <p>Tapez votre identifiant pour confirmer{mode === 'data-only' ? ' la suppression de vos données' : ' la suppression'} :</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
                  Votre identifiant
                </label>
                <div className="text-sm font-mono text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 mb-1">
                  {user.login}
                </div>
                <input
                  type="text"
                  value={loginInput}
                  onChange={e => setLoginInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loginInput === user.login && handleDelete()}
                  placeholder={user.login}
                  autoFocus
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-between">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!understood || !summary}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {mode === 'data-only' ? 'Continuer →' : 'Continuer →'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setLoginInput(''); setError(null) }}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ← Retour
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || loginInput.trim() !== user.login}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {deleting ? 'Suppression…' : (mode === 'data-only' ? 'Supprimer mes données' : 'Supprimer définitivement')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
