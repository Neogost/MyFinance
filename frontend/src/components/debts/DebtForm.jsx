import { useState, useEffect, useRef } from 'react'
import { getPositions } from '../../api/patrimoine'
import { inputCls, labelCls } from '../../components/common/formStyles.js'
import DateInput from '../ui/DateInput'

const TYPES = [
  { value: 'IMMOBILIER',   label: 'Emprunt immobilier' },
  { value: 'ETUDIANT',     label: 'Prêt étudiant' },
  { value: 'VEHICULE',     label: 'Crédit véhicule' },
  { value: 'CONSOMMATION', label: 'Crédit consommation' },
  { value: 'AUTRE',        label: 'Autre' },
]

const EMPTY = {
  type: 'IMMOBILIER',
  label: '',
  lender: '',
  startDate: '',
  endDate: '',
  initialCapital: '',
  annualRate: '',
  insuranceRate: '',
  monthlyPayment: '',
  remainingCapitalOverride: '',
  currency: 'EUR',
  positionId: '',
}

function computeProjectedBalance(initialCapital, annualRate, monthlyPayment, startDateStr) {
  if (!initialCapital || !monthlyPayment || !startDateStr) return null
  const start = new Date(startDateStr)
  const now = new Date()
  const n = Math.floor((now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()))
  if (n <= 0) return parseFloat(initialCapital)

  const P = parseFloat(initialCapital)
  const M = parseFloat(monthlyPayment)
  const annualRateNum = parseFloat(annualRate)

  if (isNaN(P) || isNaN(M)) return null

  if (!annualRateNum || annualRateNum === 0) {
    return Math.max(P - M * n, 0)
  }

  const r = annualRateNum / 12
  const pow = Math.pow(1 + r, n)
  return Math.max(P * pow - M * (pow - 1) / r, 0)
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
}

export default function DebtForm({ debt, onSubmit, onCancel }) {
  const isEdit = Boolean(debt)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [immoPositions, setImmoPositions] = useState([])
  const [positionSearch, setPositionSearch] = useState('')
  const [positionDropdownOpen, setPositionDropdownOpen] = useState(false)
  const positionRef = useRef(null)

  useEffect(() => {
    getPositions({ category: 'IMMO_PHYSIQUE', status: 'ACTIVE' })
      .then(setImmoPositions)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setForm(debt
      ? {
          type:                     debt.type ?? 'IMMOBILIER',
          label:                    debt.label ?? '',
          lender:                   debt.lender ?? '',
          startDate:                debt.startDate ?? '',
          endDate:                  debt.endDate ?? '',
          initialCapital:           debt.initialCapital ?? '',
          annualRate:               debt.annualRate != null ? (parseFloat(debt.annualRate) * 100).toFixed(4) : '',
          insuranceRate:            debt.insuranceRate != null ? (parseFloat(debt.insuranceRate) * 100).toFixed(4) : '',
          monthlyPayment:           debt.monthlyPayment ?? '',
          remainingCapitalOverride: debt.remainingCapitalOverride ?? '',
          currency:                 debt.currency ?? 'EUR',
          positionId:               debt.positionId ?? '',
        }
      : EMPTY
    )
    setPositionSearch('')
  }, [debt])

  // Synchronise le label de recherche quand immoPositions est chargé après debt
  useEffect(() => {
    if (form.positionId && immoPositions.length > 0) {
      const found = immoPositions.find(p => p.id === parseInt(form.positionId))
      if (found) setPositionSearch(found.label)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immoPositions])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const annualRateDecimal = form.annualRate ? parseFloat(form.annualRate) / 100 : null
  const hasOverride = form.remainingCapitalOverride !== '' && form.remainingCapitalOverride != null

  const projected = !hasOverride
    ? computeProjectedBalance(form.initialCapital, annualRateDecimal, form.monthlyPayment, form.startDate)
    : null

  const monthlyInsurance = form.initialCapital && form.insuranceRate
    ? parseFloat(form.initialCapital) * (parseFloat(form.insuranceRate) / 100) / 12
    : 0

  const monthlyTotal = (parseFloat(form.monthlyPayment) || 0) + monthlyInsurance

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        type:                     form.type,
        label:                    form.label,
        lender:                   form.lender || null,
        startDate:                form.startDate || null,
        endDate:                  form.endDate || null,
        initialCapital:           parseFloat(form.initialCapital),
        annualRate:               form.annualRate ? parseFloat(form.annualRate) / 100 : 0,
        insuranceRate:            form.insuranceRate ? parseFloat(form.insuranceRate) / 100 : null,
        monthlyPayment:           form.monthlyPayment ? parseFloat(form.monthlyPayment) : null,
        remainingCapitalOverride: form.remainingCapitalOverride ? parseFloat(form.remainingCapitalOverride) : null,
        currency:                 form.currency || 'EUR',
        positionId:               form.positionId ? parseInt(form.positionId) : null,
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier la dette' : 'Ajouter une dette'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Type + Libellé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Type *</label>
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Libellé *</label>
              <input name="label" type="text" value={form.label} onChange={handleChange}
                required placeholder="ex : Crédit BNP appartement Paris"
                className={inputCls} />
            </div>
          </div>

          {/* Établissement + Devise */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Établissement prêteur</label>
              <input name="lender" type="text" value={form.lender} onChange={handleChange}
                placeholder="ex : Crédit Agricole" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Devise</label>
              <input name="currency" type="text" value={form.currency} onChange={handleChange}
                placeholder="EUR" maxLength={3} className={inputCls} />
            </div>
          </div>

          {/* Capital initial + Taux annuel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Capital initial (€) *</label>
              <input name="initialCapital" type="number" min="0.01" step="0.01"
                value={form.initialCapital} onChange={handleChange}
                required placeholder="ex : 200000" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Taux d'intérêt annuel (%)</label>
              <input name="annualRate" type="number" min="0" step="0.001"
                value={form.annualRate} onChange={handleChange}
                placeholder="ex : 3.25" className={inputCls} />
            </div>
          </div>

          {/* Mensualité + Taux assurance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Mensualité hors assurance (€)</label>
              <input name="monthlyPayment" type="number" min="0" step="0.01"
                value={form.monthlyPayment} onChange={handleChange}
                placeholder="ex : 900" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Taux assurance emprunteur (%)</label>
              <input name="insuranceRate" type="number" min="0" step="0.001"
                value={form.insuranceRate} onChange={handleChange}
                placeholder="ex : 0.35" className={inputCls} />
            </div>
          </div>

          {/* Date de début + Date de fin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de début</label>
              <DateInput name="startDate" value={form.startDate} onChange={val => setForm(f => ({ ...f, startDate: val }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date de fin théorique</label>
              <DateInput name="endDate" value={form.endDate} onChange={val => setForm(f => ({ ...f, endDate: val }))} />
            </div>
          </div>

          {/* Aperçu projection */}
          {projected != null && !hasOverride && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm">
              <p className="text-indigo-700 font-semibold mb-0.5">Capital restant dû calculé automatiquement</p>
              <p className="text-indigo-800 text-base font-bold">{fmt(projected)} €</p>
              {monthlyTotal > 0 && (
                <p className="text-indigo-500 text-xs mt-0.5">
                  Coût mensuel total estimé : {fmt(monthlyTotal)} € (mensualité + assurance)
                </p>
              )}
            </div>
          )}

          {/* Override capital restant */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Capital restant dû manuel (€)
              <span className="ml-1 font-normal text-gray-400">— laisser vide pour le calcul automatique</span>
            </label>
            <input name="remainingCapitalOverride" type="number" min="0" step="0.01"
              value={form.remainingCapitalOverride} onChange={handleChange}
              placeholder="ex : 185000 (relevé bancaire, remboursement anticipé…)"
              className={inputCls} />
            {hasOverride && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Mode override actif — la projection automatique est ignorée.
              </p>
            )}
          </div>

          {/* Lien bien immobilier (uniquement pour IMMOBILIER) */}
          {form.type === 'IMMOBILIER' && (
            <div className="flex flex-col gap-1.5" ref={positionRef}>
              <label className={labelCls}>
                Lier la dette à un bien immobilier ?
                <span className="ml-1 font-normal text-gray-400">(optionnel)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={positionSearch}
                  onChange={e => {
                    setPositionSearch(e.target.value)
                    setPositionDropdownOpen(true)
                    if (!e.target.value) setForm(f => ({ ...f, positionId: '' }))
                  }}
                  onFocus={() => setPositionDropdownOpen(true)}
                  placeholder={immoPositions.length === 0 ? 'Aucun bien immobilier enregistré' : 'Rechercher un bien…'}
                  disabled={immoPositions.length === 0}
                  className={inputCls}
                />
                {form.positionId !== '' && (
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, positionId: '' })); setPositionSearch('') }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    title="Retirer le lien"
                  >×</button>
                )}
                {positionDropdownOpen && (() => {
                  const q = positionSearch.toLowerCase()
                  const filtered = immoPositions.filter(p =>
                    !q || p.label.toLowerCase().includes(q)
                  )
                  if (filtered.length === 0) return null
                  return (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPositionDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto py-1">
                        {filtered.map(p => {
                          const idx = q ? p.label.toLowerCase().indexOf(q) : -1
                          return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setForm(f => ({ ...f, positionId: String(p.id) }))
                              setPositionSearch(p.label)
                              setPositionDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition ${
                              form.positionId === String(p.id)
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                            }`}
                          >
                            <span className="font-medium">
                              {idx >= 0
                                ? <>{p.label.slice(0, idx)}<mark className="bg-yellow-100 text-gray-900 rounded-sm">{p.label.slice(idx, idx + q.length)}</mark>{p.label.slice(idx + q.length)}</>
                                : p.label}
                            </span>
                            {p.estimatedCurrentValue != null && (
                              <span className="ml-2 text-gray-400 text-xs">
                                {p.estimatedCurrentValue.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
                              </span>
                            )}
                          </button>
                        )})}
                      </div>
                    </>
                  )
                })()}
              </div>
              {form.positionId !== '' && (() => {
                const linked = immoPositions.find(p => p.id === parseInt(form.positionId))
                return linked ? (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1">
                    Lié à : <span className="font-semibold">{linked.label}</span>
                  </p>
                ) : null
              })()}
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
