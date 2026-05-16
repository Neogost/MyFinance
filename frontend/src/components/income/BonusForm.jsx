import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'
import { MONTHS_FR_LONG } from '../../utils/constants.js'
import MonthInput from '../ui/MonthInput'
import DateInput from '../ui/DateInput'

const EMPTY = { type: 'ANNUELLE', label: '', grossAmount: '', paymentDate: '', paymentMonth: '', startDate: '', endDate: '' }

// Pour les contrats PUBLIC, les primes peuvent être négatives (retenues IFSE/CIA notamment).
// Pour les contrats PRIVATE, on garde le min strictement positif.

export default function BonusForm({ bonus, contractType, onSubmit, onCancel }) {
  const allowNegative = contractType === 'PUBLIC'
  const isEdit = Boolean(bonus)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bonus) {
      setForm({
        type:         bonus.type,
        label:        bonus.label,
        grossAmount:  bonus.grossAmount,
        paymentDate:  bonus.paymentDate ?? '',
        paymentMonth: bonus.paymentMonth ?? '',
        startDate:    bonus.startDate ?? '',
        endDate:      bonus.endDate   ?? '',
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
        type:         form.type,
        label:        form.label,
        grossAmount:  parseFloat(form.grossAmount),
        paymentDate:  form.type === 'EXCEPTIONNELLE' ? (form.paymentDate || null) : null,
        paymentMonth: form.type === 'ANNUELLE'       ? parseInt(form.paymentMonth) : null,
        startDate:    form.type === 'MENSUELLE'      ? form.startDate || null : null,
        endDate:      form.type === 'MENSUELLE'      ? (form.endDate || null) : null,
      }
      await onSubmit(payload)
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
          {isEdit ? 'Modifier la prime' : 'Ajouter une prime'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Type de prime */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type de prime *</label>
            <div className="flex gap-2">
              {[['ANNUELLE', 'Annuelle'], ['EXCEPTIONNELLE', 'Exceptionnelle'], ['MENSUELLE', 'Mensuelle']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: val, paymentDate: '', paymentMonth: '', startDate: '', endDate: '' }))}
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
              required placeholder={form.type === 'MENSUELLE' ? 'ex : Prime transport, Astreinte mensuelle…' : 'ex : 13ème mois, Prime Macron…'}
              className={inputCls}
            />
          </div>

          {/* Montant */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Montant brut (€) *
              {form.type === 'MENSUELLE' && <span className="text-gray-400 font-normal ml-1">— par mois</span>}
            </label>
            <input
              name="grossAmount" type="number"
              min={allowNegative ? undefined : "0.01"}
              step="0.01"
              value={form.grossAmount} onChange={handleChange}
              required placeholder={allowNegative ? "ex : 1000.00 ou -50.00" : "1000.00"}
              className={inputCls}
            />
            {allowNegative && (
              <p className="text-xs text-gray-400">
                Montants négatifs autorisés pour les retenues (IFSE/CIA, etc.).
              </p>
            )}
          </div>

          {/* Champ conditionnel selon le type */}
          {form.type === 'EXCEPTIONNELLE' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Mois de versement *</label>
              <MonthInput
                name="paymentDate"
                value={form.paymentDate}
                onChange={val => setForm(f => ({ ...f, paymentDate: val }))}
                required
              />
            </div>
          )}

          {form.type === 'ANNUELLE' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Mois de versement *</label>
              <select
                name="paymentMonth" value={form.paymentMonth}
                onChange={handleChange} required
                className={inputCls}
              >
                <option value="">— Choisir —</option>
                {MONTHS_FR_LONG.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {form.type === 'MENSUELLE' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Date de début *</label>
                <DateInput name="startDate" value={form.startDate} onChange={val => setForm(f => ({ ...f, startDate: val }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>
                  Date de fin
                  <span className="text-gray-400 font-normal ml-1">— optionnelle (vide = indéfinie)</span>
                </label>
                <DateInput name="endDate" value={form.endDate} onChange={val => setForm(f => ({ ...f, endDate: val }))} minDate={form.startDate || null} />
              </div>
            </div>
          )}

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
