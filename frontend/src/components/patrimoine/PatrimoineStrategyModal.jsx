import { useState } from 'react'
import { savePatrimoineTargets } from '../../api/patrimoine'
import { CATEGORY_META } from './constants'

const CATEGORY_ORDER = ['LIQUIDITE', 'LIVRET', 'BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'IMMO_PHYSIQUE']

export default function PatrimoineStrategyModal({ onClose, targets, onSave }) {
  const [inputs, setInputs] = useState(() => {
    const init = {}
    CATEGORY_ORDER.forEach(cat => {
      init[cat] = targets[cat] != null ? String(targets[cat]) : ''
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {}
      CATEGORY_ORDER.forEach(cat => {
        const v = parseFloat(inputs[cat])
        if (!isNaN(v) && v > 0) payload[cat] = v
      })
      const updated = await savePatrimoineTargets(payload)
      onSave(updated)
      onClose()
    } catch {
      setError('Impossible d\'enregistrer les objectifs.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Stratégie & Objectifs patrimoniaux</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <p className="text-xs text-gray-400 mb-5">
          Définissez un montant cible par catégorie. Une barre de progression apparaîtra sur chaque carte.
        </p>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="space-y-3">
          {CATEGORY_ORDER.map(cat => {
            const meta = CATEGORY_META[cat]
            return (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{meta.icon}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-28 text-center shrink-0 ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Pas d'objectif"
                    value={inputs[cat]}
                    onChange={e => setInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
