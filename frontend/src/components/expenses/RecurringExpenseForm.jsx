import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'

const CATEGORIES = [
  { value: 'LOGEMENT',    label: 'Logement' },
  { value: 'TRANSPORT',   label: 'Transport' },
  { value: 'ASSURANCES',  label: 'Assurances & Prévoyance' },
  { value: 'ABONNEMENTS', label: 'Abonnements & Numérique' },
  { value: 'SANTE',       label: 'Santé & Bien-être' },
  { value: 'FAMILLE',     label: 'Famille & Enfants' },
  { value: 'ALIMENTATION', label: 'Alimentation' },
  { value: 'EPARGNE',     label: 'Épargne programmée' },
  { value: 'AUTRE',       label: 'Autre' },
]

const EMPTY = {
  category: 'LOGEMENT',
  label: '',
  amount: '',
  frequency: 'MONTHLY',
  sharePercentage: 100,
  startDate: '',
  endDate: '',
  notes: '',
  paymentDay: '',
}

export default function RecurringExpenseForm({ expense, onSubmit, onCancel }) {
  const isEdit = Boolean(expense)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(expense
      ? {
          category:        expense.category,
          label:           expense.label,
          amount:          expense.amount,
          frequency:       expense.frequency,
          sharePercentage: expense.sharePercentage,
          startDate:       expense.startDate ?? '',
          endDate:         expense.endDate ?? '',
          notes:           expense.notes ?? '',
          paymentDay:      expense.paymentDay ?? '',
        }
      : EMPTY
    )
  }, [expense])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  // Aperçu du montant effectif selon part et fréquence
  const effectiveAmount = form.amount
    ? parseFloat(form.amount) * (parseFloat(form.sharePercentage) / 100)
    : null
  const monthlyPreview = effectiveAmount
    ? form.frequency === 'MONTHLY' ? effectiveAmount : effectiveAmount / 12
    : null
  const annualPreview = effectiveAmount
    ? form.frequency === 'ANNUAL' ? effectiveAmount : effectiveAmount * 12
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        ...form,
        amount:          parseFloat(form.amount),
        sharePercentage: parseFloat(form.sharePercentage),
        startDate:       form.startDate  || null,
        endDate:         form.endDate    || null,
        notes:           form.notes      || null,
        paymentDay:      form.frequency === 'MONTHLY' && form.paymentDay ? parseInt(form.paymentDay, 10) : null,
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier la dépense' : 'Ajouter une dépense récurrente'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Catégorie */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Catégorie *</label>
            <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Libellé */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Description *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Loyer Paris 11e"
              className={inputCls}
            />
          </div>

          {/* Montant + Fréquence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Montant (€) *</label>
              <input
                name="amount" type="number" min="0.01" step="0.01" value={form.amount}
                onChange={handleChange} required placeholder="1000.00"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Fréquence *</label>
              <select name="frequency" value={form.frequency} onChange={handleChange} className={inputCls}>
                <option value="MONTHLY">Mensuelle</option>
                <option value="ANNUAL">Annuelle</option>
              </select>
            </div>
          </div>

          {/* Jour de prélèvement — mensuel uniquement */}
          {form.frequency === 'MONTHLY' && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Jour de prélèvement
                <span className="ml-1 font-normal text-gray-400">(optionnel, 1–28)</span>
              </label>
              <input
                name="paymentDay" type="number" min="1" max="28" step="1"
                value={form.paymentDay} onChange={handleChange}
                placeholder="ex : 8"
                className={inputCls}
              />
              {form.paymentDay && (
                <p className="text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1">
                  Prélèvement le <strong>{form.paymentDay}</strong> de chaque mois — visible dans le calendrier des abonnements
                </p>
              )}
            </div>
          )}
          {form.frequency === 'ANNUAL' && form.startDate && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              La date de prélèvement est déduite de la date de début : le <strong>{new Date(form.startDate + 'T00:00:00').getDate()}</strong> de chaque année.
            </p>
          )}
          {form.frequency === 'ANNUAL' && !form.startDate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Sans date de début, cette dépense n'apparaîtra pas dans le calendrier des abonnements.
            </p>
          )}

          {/* Part colocation */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Ma part (%)
              <span className="ml-1 font-normal text-gray-400">— 100% si pas de partage</span>
            </label>
            <input
              name="sharePercentage" type="number" min="0.01" max="100" step="0.01"
              value={form.sharePercentage} onChange={handleChange} required
              className={inputCls}
            />
            {parseFloat(form.sharePercentage) < 100 && effectiveAmount != null && (
              <p className="text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1">
                Quote-part effective : <strong>{effectiveAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong>
                {form.frequency === 'ANNUAL' ? '/an' : '/mois'}
              </p>
            )}
          </div>

          {/* Aperçu projection */}
          {monthlyPreview != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">Mensuel : </span>
                <span className="font-semibold text-gray-800">
                  {monthlyPreview.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
              <div>
                <span className="text-gray-500">Annuel : </span>
                <span className="font-semibold text-gray-800">
                  {annualPreview.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          )}

          {/* Dates optionnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de début <span className="font-normal text-gray-400">(optionnel)</span></label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de fin <span className="font-normal text-gray-400">(laisser vide si en cours)</span></label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optionnel)</span></label>
            <textarea
              name="notes" value={form.notes} onChange={handleChange}
              rows={2} placeholder="ex : Colocation avec Thomas"
              className={inputCls + ' resize-none'}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

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
