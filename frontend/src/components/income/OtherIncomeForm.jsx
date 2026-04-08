import { useState, useEffect } from 'react'

const TYPES = [
  { value: 'LOCATIF',     label: 'Revenu locatif' },
  { value: 'DIVIDENDE',   label: 'Dividende' },
  { value: 'AIDE_SOCIALE', label: 'Aide sociale' },
  { value: 'AUTRE',       label: 'Autre' },
]

const EMPTY = { type: 'LOCATIF', label: '', amount: '', date: '' }

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

export default function OtherIncomeForm({ income, onSubmit, onCancel }) {
  const isEdit = Boolean(income)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(income
      ? { type: income.type, label: income.label, amount: income.amount, date: income.date }
      : EMPTY
    )
  }, [income])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({ ...form, amount: parseFloat(form.amount) })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier le revenu' : 'Ajouter un revenu complémentaire'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type de revenu *</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Description *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Loyer appartement Lyon"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Montant (€) *</label>
              <input
                name="amount" type="number" min="0.01" step="0.01" value={form.amount}
                onChange={handleChange} required placeholder="750.00"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de perception *</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} required className={inputCls} />
            </div>
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
