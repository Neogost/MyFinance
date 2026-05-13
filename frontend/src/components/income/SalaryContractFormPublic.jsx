import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'
import { getPublicPointValue } from '../../api/income'
import DateInput from '../ui/DateInput'

const EMPTY = {
  publicSubType: 'TITULAIRE',
  companyName: '',
  startDate: '', endDate: '',
  indiceMajore: '',
  weeklyHours: '35',
  mealVoucherAmount: '0',
  mealVoucherEmployeeRate: '50',
  employeePrevoyanceRate: '', partTimePercentage: '100',
}

export default function SalaryContractFormPublic({ contract, onSubmit, onCancel }) {
  const isEdit = Boolean(contract)
  const [form, setForm]           = useState(EMPTY)
  const [grossPreview, setGrossPreview] = useState(null)
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (contract) {
      setForm({
        publicSubType:           contract.publicSubType           ?? 'TITULAIRE',
        companyName:             contract.companyName             ?? '',
        startDate:               contract.startDate               ?? '',
        endDate:                 contract.endDate                 ?? '',
        indiceMajore:            contract.indiceMajore            ?? '',
        weeklyHours:             contract.weeklyHours             ?? '35',
        mealVoucherAmount:       contract.mealVoucherAmount       ?? '0',
        mealVoucherEmployeeRate: contract.mealVoucherEmployeeRate ?? '50',
        employeePrevoyanceRate:  contract.employeePrevoyanceRate != null
          ? (contract.employeePrevoyanceRate * 100).toFixed(2) : '',
        partTimePercentage:      contract.partTimePercentage != null
          ? String(contract.partTimePercentage) : '100',
      })
    } else {
      setForm(EMPTY)
    }
  }, [contract])

  // Aperçu du brut calculé depuis l'indice
  useEffect(() => {
    const im   = parseInt(form.indiceMajore, 10)
    const date = form.startDate || new Date().toISOString().slice(0, 10)
    if (!im || im < 1) { setGrossPreview(null); return }
    getPublicPointValue(date)
      .then(pv => setGrossPreview({ gross: im * pv, pointValue: pv }))
      .catch(() => setGrossPreview(null))
  }, [form.indiceMajore, form.startDate])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        contractType:            'PUBLIC',
        publicSubType:           form.publicSubType,
        indiceMajore:            parseInt(form.indiceMajore, 10),
        companyName:             form.companyName || null,
        startDate:               form.startDate   || null,
        endDate:                 form.endDate     || null,
        paidMonthsPerYear:       12,
        weeklyHours:             parseFloat(form.weeklyHours),
        mealVoucherAmount:       parseFloat(form.mealVoucherAmount),
        mealVoucherEmployeeRate: parseFloat(form.mealVoucherEmployeeRate),
        isCadre:                 false,
        employeePrevoyanceRate:  form.employeePrevoyanceRate !== ''
          ? parseFloat(form.employeePrevoyanceRate) / 100 : null,
        partTimePercentage:      parseFloat(form.partTimePercentage) || 100,
      })
    } catch (err) {
      const status = err.response?.status
      setError(status === 409
        ? 'Un contrat actif existe déjà. Clôturez-le avant d\'en créer un nouveau.'
        : 'Une erreur est survenue lors de l\'enregistrement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          🏛️ {isEdit ? 'Modifier le contrat' : 'Nouveau contrat — Fonction publique'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Sous-type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Statut *</label>
            <select name="publicSubType" value={form.publicSubType} onChange={handleChange}
              required className={inputCls}>
              <option value="TITULAIRE">Titulaire (fonctionnaire stagiaire ou titulaire)</option>
              <option value="CONTRACTUEL">Contractuel (CDD / CDI de droit public)</option>
            </select>
            {form.publicSubType === 'CONTRACTUEL' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Contractuel : cotisations régime général (identique au privé).
              </p>
            )}
          </div>

          {/* Employeur + dates */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Administration / employeur</label>
            <input name="companyName" type="text" value={form.companyName} onChange={handleChange}
              placeholder="Ex. : Mairie de Paris, CHU de Lyon…" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de début *</label>
              <DateInput name="startDate" value={form.startDate} onChange={val => setForm(f => ({ ...f, startDate: val }))} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de fin</label>
              <DateInput name="endDate" value={form.endDate} onChange={val => setForm(f => ({ ...f, endDate: val }))} />
            </div>
          </div>

          {/* Indice majoré — cœur du formulaire */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Indice majoré (IM) *</label>
            <input name="indiceMajore" type="number" min="1" step="1"
              value={form.indiceMajore} onChange={handleChange}
              required placeholder="Ex. : 421" className={inputCls} />
            {grossPreview != null ? (
              <p className="text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 rounded-lg px-3 py-2">
                Traitement brut annuel estimé :{' '}
                <strong>
                  {grossPreview.gross.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </strong>
                {' '}({form.indiceMajore} × {grossPreview.pointValue.toFixed(4)} € — valeur du point en vigueur)
              </p>
            ) : form.indiceMajore && parseInt(form.indiceMajore, 10) >= 200 ? (
              <p className="text-xs text-gray-400">Calcul en cours…</p>
            ) : null}
            <p className="text-xs text-gray-400">
              L'indice majoré (IM) se trouve sur votre fiche de paie ou dans votre arrêté de nomination.
            </p>
          </div>

          {/* Heures / semaine */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Heures / semaine *</label>
            <input name="weeklyHours" type="number" min="1" max="60" step="0.5"
              value={form.weeklyHours} onChange={handleChange}
              required className={inputCls} />
          </div>

          {/* Ticket restaurant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Valeur du ticket restaurant (€)</label>
              <input name="mealVoucherAmount" type="number" min="0" step="0.01"
                value={form.mealVoucherAmount} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Part salarié (%)</label>
              <input name="mealVoucherEmployeeRate" type="number" min="0" max="100" step="1"
                value={form.mealVoucherEmployeeRate} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* Prévoyance / mutuelle */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Prévoyance / mutuelle salarié (%)</label>
            <input name="employeePrevoyanceRate" type="number" min="0" max="100" step="0.01"
              value={form.employeePrevoyanceRate} onChange={handleChange}
              placeholder="Ex. : 1.5" className={inputCls} />
          </div>

          {/* Quotité de travail */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Quotité de travail (%)
              <span className="ml-2 text-gray-400 font-normal text-xs">
                {parseFloat(form.partTimePercentage) === 100
                  ? '— Temps plein'
                  : parseFloat(form.partTimePercentage) === 80
                    ? '— 4/5e'
                    : parseFloat(form.partTimePercentage) === 70
                      ? '— 7/10e'
                      : parseFloat(form.partTimePercentage) === 50
                        ? '— Mi-temps'
                        : `— ${form.partTimePercentage} %`}
              </span>
            </label>
            <input
              name="partTimePercentage" type="number" min="10" max="100" step="0.1"
              value={form.partTimePercentage} onChange={handleChange}
              className={inputCls}
            />
            <p className="text-xs text-gray-400">
              L'indice majoré saisi correspond au temps plein. La quotité réduit toutes les projections calculées.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le contrat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
