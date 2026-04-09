import { useState, useEffect } from 'react'

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const EMPTY = { type: 'ANNUELLE', label: '', grossAmount: '', paymentDate: '', paymentMonth: '' }

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

export default function BonusForm({ bonus, onSubmit, onCancel }) {
  const isEdit = Boolean(bonus)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bonus) {
      setForm({
        type: bonus.type,
        label: bonus.label,
        grossAmount: bonus.grossAmount,
        // paymentDate est "YYYY-MM-DD", on garde juste "YYYY-MM" pour l'input type="month"
        paymentDate: bonus.paymentDate ? bonus.paymentDate.slice(0, 7) : '',
        paymentMonth: bonus.paymentMonth ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [bonus])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        type: form.type,
        label: form.label,
        grossAmount: parseFloat(form.grossAmount),
        // EXCEPTIONNELLE : convertit "YYYY-MM" en "YYYY-MM-01" pour le backend
        paymentDate: form.type === 'EXCEPTIONNELLE' ? `${form.paymentDate}-01` : null,
        paymentMonth: form.type === 'ANNUELLE' ? parseInt(form.paymentMonth) : null,
      }
      await onSubmit(payload)
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
          {isEdit ? 'Modifier la prime' : 'Ajouter une prime'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Type de prime */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type de prime *</label>
            <div className="flex gap-3">
              {[['ANNUELLE', 'Annuelle'], ['EXCEPTIONNELLE', 'Exceptionnelle']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: val, paymentDate: '', paymentMonth: '' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                    form.type === val
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Nom de la prime *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : 13ème mois, Prime Macron…"
              className={inputCls}
            />
          </div>

          {/* Montant + champ de date selon le type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Montant brut (€) *</label>
              <input
                name="grossAmount" type="number" min="0.01" step="0.01"
                value={form.grossAmount} onChange={handleChange}
                required placeholder="1000.00"
                className={inputCls}
              />
            </div>

            {form.type === 'EXCEPTIONNELLE' ? (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Mois de versement *</label>
                <input
                  name="paymentDate" type="month" value={form.paymentDate}
                  onChange={handleChange} required
                  className={inputCls}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Mois de versement *</label>
                <select
                  name="paymentMonth" value={form.paymentMonth}
                  onChange={handleChange} required
                  className={inputCls}
                >
                  <option value="">— Choisir —</option>
                  {MONTHS_FR.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            )}
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
