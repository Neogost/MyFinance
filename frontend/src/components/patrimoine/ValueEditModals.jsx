import { useState } from 'react'

export function BalanceEditModal({ position, onSave, onCancel }) {
  const [value, setValue]   = useState(position.currentBalance ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try { await onSave(parseFloat(value)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-7 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 mb-4">Mettre à jour le solde</h3>
        <p className="text-sm text-gray-500 mb-3">{position.label}</p>
        <input type="number" min="0" step="0.01" value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          placeholder="Nouveau solde en €" autoFocus />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || value === ''}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EstimatedValueModal({ position, onSave, onCancel }) {
  const [value, setValue]   = useState(position.estimatedCurrentValue ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try { await onSave(parseFloat(value)) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-7 w-full sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-900 mb-4">Mettre à jour la valeur estimée</h3>
        <p className="text-sm text-gray-500 mb-3">{position.label}</p>
        <input type="number" min="0" step="0.01" value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          placeholder="Valeur estimée en €" autoFocus />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading || value === ''}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
