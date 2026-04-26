import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'

const EMPTY = { label: '', monthlyAmount: '' }

export default function BenefitForm({ benefit, onSubmit, onCancel }) {
  const isEdit = Boolean(benefit)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(benefit ? { label: benefit.label, monthlyAmount: benefit.monthlyAmount } : EMPTY)
  }, [benefit])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({ label: form.label, monthlyAmount: parseFloat(form.monthlyAmount) })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? "Modifier l'avantage" : 'Ajouter un avantage en nature'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type d'avantage *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Frais de télétravail, Forfait téléphone…"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Montant mensuel (€) *</label>
            <input
              name="monthlyAmount" type="number" min="0.01" step="0.01"
              value={form.monthlyAmount} onChange={handleChange}
              required placeholder="50.00"
              className={inputCls}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
