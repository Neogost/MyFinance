import { useState, useEffect } from 'react'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

const EMPTY = { weeklyFlatRate: '', estimatedWeeksPerYear: '' }

export default function OnCallForm({ onCall, onSubmit, onCancel }) {
  const isEdit = Boolean(onCall)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(onCall
      ? { weeklyFlatRate: onCall.weeklyFlatRate, estimatedWeeksPerYear: onCall.estimatedWeeksPerYear }
      : EMPTY
    )
  }, [onCall])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        weeklyFlatRate: parseFloat(form.weeklyFlatRate),
        estimatedWeeksPerYear: parseInt(form.estimatedWeeksPerYear, 10),
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const annualPreview = form.weeklyFlatRate && form.estimatedWeeksPerYear
    ? parseFloat(form.weeklyFlatRate) * parseInt(form.estimatedWeeksPerYear, 10)
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier l\'astreinte' : 'Ajouter une astreinte'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Forfait hebdomadaire (€) *</label>
            <input
              name="weeklyFlatRate" type="number" min="0.01" step="0.01"
              value={form.weeklyFlatRate} onChange={handleChange}
              required placeholder="500.00" className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Semaines d'astreinte estimées / an *</label>
            <input
              name="estimatedWeeksPerYear" type="number" min="1" max="52" step="1"
              value={form.estimatedWeeksPerYear} onChange={handleChange}
              required placeholder="5" className={inputCls}
            />
          </div>

          {annualPreview != null && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm text-indigo-700">
              Revenu annuel estimé : <span className="font-semibold amount">
                {annualPreview.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
