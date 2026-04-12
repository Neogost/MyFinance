import { useState, useEffect } from 'react'

const EMPTY = { effectiveDate: '', annualGrossSalary: '', label: '' }

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

export default function RevisionForm({ revision, onSubmit, onCancel }) {
  const isEdit = Boolean(revision)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(revision
      ? { effectiveDate: revision.effectiveDate, annualGrossSalary: revision.annualGrossSalary, label: revision.label ?? '' }
      : EMPTY)
  }, [revision])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        effectiveDate: form.effectiveDate,
        annualGrossSalary: parseFloat(form.annualGrossSalary),
        label: form.label || null,
      })
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(msg ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier la révision' : 'Ajouter une révision salariale'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Date d'entrée en vigueur *</label>
            <input
              name="effectiveDate" type="date" value={form.effectiveDate} onChange={handleChange}
              required className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Salaire brut annuel (€) *</label>
            <input
              name="annualGrossSalary" type="number" min="1" step="0.01"
              value={form.annualGrossSalary} onChange={handleChange}
              required placeholder="48000.00"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Libellé</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              placeholder="ex : Augmentation annuelle 2025, Promotion…"
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
