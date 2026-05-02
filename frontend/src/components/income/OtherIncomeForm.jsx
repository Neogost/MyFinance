import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'
import { getPositions } from '../../api/patrimoine'
import { useAnalytics } from '../../hooks/useAnalytics'

const TYPES = [
  { value: 'LOCATIF',      label: 'Revenu locatif' },
  { value: 'DIVIDENDE',    label: 'Dividende' },
  { value: 'AIDE_SOCIALE', label: 'Aide sociale' },
  { value: 'AUTRE',        label: 'Autre' },
]

const EMPTY = {
  type: 'LOCATIF',
  label: '',
  amount: '',
  date: '',
  isTaxable: true,
  specificTaxRate: '',
  positionId: '',
  // Contrat de location (LOCATIF uniquement)
  periodStart: '',
  periodEnd: '',
  dayOfMonth: '',
}

export default function OtherIncomeForm({ income, onSubmit, onCancel }) {
  const isEdit = Boolean(income)
  const { trackEvent } = useAnalytics()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [immoPositions, setImmoPositions] = useState([])

  useEffect(() => {
    setForm(income
      ? {
          type:            income.type,
          label:           income.label,
          amount:          income.amount,
          date:            income.date ?? '',
          isTaxable:       income.isTaxable ?? true,
          specificTaxRate: income.specificTaxRate ?? '',
          positionId:      income.positionId ?? '',
          periodStart:     income.periodStart ?? '',
          periodEnd:       income.periodEnd ?? '',
          dayOfMonth:      income.dayOfMonth ?? '',
        }
      : EMPTY
    )
    setError(null)
  }, [income])

  // Charger les biens IMMO_PHYSIQUE actifs (pour le sélecteur LOCATIF)
  useEffect(() => {
    getPositions({ category: 'IMMO_PHYSIQUE', status: 'ACTIVE' })
      .then(setImmoPositions)
      .catch(() => setImmoPositions([]))
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'isTaxable' && !checked ? { specificTaxRate: '' } : {}),
      // Réinitialiser les champs LOCATIF si on change de type
      ...(name === 'type' && value !== 'LOCATIF'
        ? { positionId: '', periodStart: '', periodEnd: '', dayOfMonth: '' }
        : {}),
    }))
  }

  const isLocatif  = form.type === 'LOCATIF'
  const isContrat  = isLocatif && form.periodStart !== ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        ...form,
        amount:          parseFloat(form.amount),
        date:            isContrat ? null : (form.date || null),
        specificTaxRate: form.specificTaxRate !== '' ? parseFloat(form.specificTaxRate) : null,
        positionId:      form.positionId !== '' ? parseInt(form.positionId) : null,
        periodStart:     form.periodStart || null,
        periodEnd:       form.periodEnd   || null,
        dayOfMonth:      form.dayOfMonth !== '' ? parseInt(form.dayOfMonth) : null,
      })
      trackEvent('FORM_SUBMIT', `income.otherIncome.${isEdit ? 'edit' : 'create'}`)
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
          {isEdit ? 'Modifier le revenu' : 'Ajouter un revenu complémentaire'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Type de revenu *</label>
            <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Contrat de location — LOCATIF uniquement */}
          {isLocatif && (
            <div className="border border-indigo-100 rounded-lg p-4 flex flex-col gap-3 bg-indigo-50/40">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Contrat de location</p>
              <p className="text-xs text-gray-500">Renseignez la période du bail pour éviter la saisie mensuelle. Le simulateur d'impôts calculera automatiquement le montant annuel.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Début du bail</label>
                  <input name="periodStart" type="date" value={form.periodStart} onChange={handleChange} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Fin du bail <span className="font-normal text-gray-400">(vide = en cours)</span></label>
                  <input name="periodEnd" type="date" value={form.periodEnd} onChange={handleChange} className={inputCls} />
                </div>
              </div>
              {isContrat && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Jour de perception du loyer <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input
                      name="dayOfMonth" type="number" min="1" max="28"
                      value={form.dayOfMonth} onChange={handleChange}
                      placeholder="ex : 5"
                      className={`${inputCls} w-24`}
                      required={isContrat}
                    />
                    <span className="text-sm text-gray-500">du mois</span>
                  </div>
                  <p className="text-xs text-gray-400">Entre 1 et 28 pour garantir la validité tous les mois.</p>
                </div>
              )}
            </div>
          )}

          {/* Bien immobilier associé — LOCATIF uniquement */}
          {isLocatif && immoPositions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Bien immobilier associé</label>
              <select name="positionId" value={form.positionId} onChange={handleChange} className={inputCls}>
                <option value="">— Aucun bien associé —</option>
                {immoPositions.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                Associer ce loyer à un bien permet de calculer le rendement locatif dans les objectifs patrimoniaux.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Description *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Loyer appartement Lyon"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Montant (€) *
                {isContrat && <span className="ml-1 font-normal text-gray-400">par mois</span>}
              </label>
              <input
                name="amount" type="number" min="0.01" step="0.01" value={form.amount}
                onChange={handleChange} required placeholder="750.00"
                className={inputCls}
              />
            </div>
            {!isContrat && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Date de perception *</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} required className={inputCls} />
              </div>
            )}
          </div>

          {/* ── Fiscalité ── */}
          <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiscalité</p>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox" name="isTaxable" checked={form.isTaxable}
                onChange={handleChange} className="accent-indigo-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Revenu imposable</span>
            </label>

            {form.isTaxable && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>
                  Taux d'imposition spécifique (%)
                  <span className="ml-1 font-normal text-gray-400">— laisser vide pour le barème progressif</span>
                </label>
                <input
                  name="specificTaxRate" type="number" min="0" max="100" step="0.1"
                  value={form.specificTaxRate} onChange={handleChange}
                  placeholder="ex : 12.8 pour le PFU dividendes"
                  className={inputCls}
                />
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
