import { useState } from 'react'
import { TEMPLATE_LIST } from './dashboard-templates'

export default function DashboardCreateModal({ onClose, onCreate }) {
  const [name,        setName]        = useState('')
  const [templateKey, setTemplateKey] = useState('synthese')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onCreate(name.trim(), templateKey)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-xl
                      max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">Nouveau tableau de bord</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
            <input
              autoFocus
              maxLength={50}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Famille, Investissements…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
            />
          </div>

          {/* Templates */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Template de départ</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TEMPLATE_LIST.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplateKey(t.key)}
                  className={`text-left p-3 rounded-xl border-2 transition
                    ${templateKey === t.key
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="text-lg mb-1">{t.icon}</p>
                  <p className="text-xs font-semibold text-gray-800">{t.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg
                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
