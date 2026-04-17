import { useState, useEffect } from 'react'

const CATEGORIES = [
  { value: 'VEHICULE',       label: 'Véhicule',                 rate: 0.15, residual: 0.10 },
  { value: 'INFORMATIQUE',   label: 'Informatique & High-tech',  rate: 0.30, residual: 0.05 },
  { value: 'ELECTROMENAGER', label: 'Électroménager & Maison',   rate: 0.12, residual: 0.08 },
  { value: 'MOBILIER',       label: 'Mobilier & Décoration',     rate: 0.08, residual: 0.10 },
  { value: 'COLLECTION',     label: 'Collection',                rate: 0.00, residual: 1.00 },
  { value: 'LOISIRS',        label: 'Loisirs & Sport',           rate: 0.15, residual: 0.10 },
  { value: 'AUTRE',          label: 'Autre',                     rate: 0.10, residual: 0.10 },
]

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

const EMPTY = {
  category: 'VEHICULE',
  label: '',
  purchasePrice: '',
  purchaseDate: '',
  estimatedCurrentValue: '',
  notes: '',
}

function fmt(n) {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
}

function computeDepreciation(purchasePrice, purchaseDate, category) {
  if (!purchasePrice || !purchaseDate || purchasePrice <= 0) return null
  const cat = CATEGORIES.find(c => c.value === category)
  if (!cat) return null

  const days = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
  const years = days / 365.25
  if (years < 0) return null

  const minValue = purchasePrice * cat.residual
  if (cat.rate === 0) return purchasePrice

  const computed = purchasePrice * Math.pow(1 - cat.rate, years)
  return Math.max(computed, minValue)
}

export default function PossessionForm({ possession, onSubmit, onCancel }) {
  const isEdit = Boolean(possession)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(possession
      ? {
          category:              possession.category,
          label:                 possession.label,
          purchasePrice:         possession.purchasePrice,
          purchaseDate:          possession.purchaseDate ?? '',
          estimatedCurrentValue: possession.estimatedCurrentValue ?? '',
          notes:                 possession.notes ?? '',
        }
      : EMPTY
    )
  }, [possession])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const price = parseFloat(form.purchasePrice)
  const hasOverride = form.estimatedCurrentValue !== '' && parseFloat(form.estimatedCurrentValue) > 0
  const projected = !hasOverride
    ? computeDepreciation(price, form.purchaseDate, form.category)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        category:              form.category,
        label:                 form.label,
        purchasePrice:         parseFloat(form.purchasePrice),
        purchaseDate:          form.purchaseDate || null,
        estimatedCurrentValue: form.estimatedCurrentValue ? parseFloat(form.estimatedCurrentValue) : null,
        notes:                 form.notes || null,
      })
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier la possession' : 'Ajouter une grande possession'}
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
            <label className={labelCls}>Libellé *</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              required placeholder="ex : Renault Clio 2022, MacBook Pro M3…"
              className={inputCls}
            />
          </div>

          {/* Prix d'achat + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prix d'achat (€) *</label>
              <input
                name="purchasePrice" type="number" min="0.01" step="0.01"
                value={form.purchasePrice} onChange={handleChange}
                required placeholder="ex : 18500"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Date d'acquisition *</label>
              <input
                name="purchaseDate" type="date" value={form.purchaseDate}
                onChange={handleChange} required className={inputCls}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Aperçu projection automatique */}
          {projected != null && !hasOverride && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm">
              <p className="text-indigo-700 font-semibold mb-0.5">Valeur estimée automatiquement</p>
              <p className="text-indigo-800 text-base font-bold">{fmt(projected)} €</p>
              <p className="text-indigo-500 text-xs mt-0.5">
                Décote {CATEGORIES.find(c => c.value === form.category)?.rate * 100 ?? 0} %/an
                · Décote cumulée : {fmt(price - projected)} €
                ({((price - projected) / price * 100).toFixed(1)} %)
              </p>
            </div>
          )}

          {/* Valeur actuelle manuelle */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Valeur actuelle estimée (€)
              <span className="ml-1 font-normal text-gray-400">— laisser vide pour le calcul auto</span>
            </label>
            <input
              name="estimatedCurrentValue" type="number" min="0" step="0.01"
              value={form.estimatedCurrentValue} onChange={handleChange}
              placeholder="ex : 10000 (Argus, offre de rachat…)"
              className={inputCls}
            />
            {hasOverride && projected != null && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Override manuel actif — valeur auto : {fmt(projected)} €
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Notes <span className="font-normal text-gray-400">(optionnel)</span></label>
            <textarea
              name="notes" value={form.notes} onChange={handleChange}
              rows={2} placeholder="ex : Kilométrage 45 000 km, achetée neuve…"
              className={inputCls + ' resize-none'}
            />
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
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
