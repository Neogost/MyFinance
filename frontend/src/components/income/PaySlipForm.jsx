import { useState, useEffect } from 'react'
import { labelCls } from '../../components/common/formStyles.js'

const EMPTY = { period: '', grossSalary: '', taxableNetSalary: '', netSalary: '', incomeTaxWithholding: '' }

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'

export default function PaySlipForm({ slip, onSubmit, onCancel }) {
  // En duplication, slip existe mais sans id — on reste en mode création
  const isEdit = Boolean(slip?.id)
  const isDuplicate = Boolean(slip && !slip.id)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (slip) {
      setForm({
        period:               slip.period              ?? '',
        grossSalary:          slip.grossSalary          ?? '',
        taxableNetSalary:     slip.taxableNetSalary     ?? '',
        netSalary:            slip.netSalary            ?? '',
        incomeTaxWithholding: slip.incomeTaxWithholding ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [slip])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        period:               form.period,
        grossSalary:          parseFloat(form.grossSalary),
        taxableNetSalary:     parseFloat(form.taxableNetSalary),
        netSalary:            parseFloat(form.netSalary),
        incomeTaxWithholding: parseFloat(form.incomeTaxWithholding),
      })
    } catch (err) {
      const status = err.response?.status
      setError(status === 409
        ? 'Un bulletin existe déjà pour cette période.'
        : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit
            ? 'Modifier le bulletin'
            : isDuplicate
              ? 'Dupliquer un bulletin de paie'
              : 'Ajouter un bulletin de paie'}
        </h2>
        {isDuplicate && (
          <p className="text-xs text-gray-500 -mt-4 mb-4">
            Les montants ont été pré-remplis. Sélectionnez la période concernée pour créer le nouveau bulletin.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Période (mois) *</label>
            <input
              name="period" type="month" value={form.period?.slice(0, 7) ?? ''}
              onChange={e => setForm(f => ({ ...f, period: e.target.value + '-01' }))}
              required className={inputCls}
            />
            <p className="text-xs text-gray-400">Sélectionnez le mois concerné</p>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Brut (€) *</label>
              <input name="grossSalary" type="number" min="0" step="0.01" value={form.grossSalary} onChange={handleChange} required placeholder="3750.00" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Net fiscal (€) *</label>
              <input name="taxableNetSalary" type="number" min="0" step="0.01" value={form.taxableNetSalary} onChange={handleChange} required placeholder="3000.00" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Net versé (€) *</label>
              <input name="netSalary" type="number" min="0" step="0.01" value={form.netSalary} onChange={handleChange} required placeholder="2680.00" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prélèvement à la source (€) *</label>
              <input name="incomeTaxWithholding" type="number" min="0" step="0.01" value={form.incomeTaxWithholding} onChange={handleChange} required placeholder="320.00" className={inputCls} />
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
