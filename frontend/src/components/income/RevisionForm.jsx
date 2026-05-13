import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'
import { getPublicPointValue } from '../../api/income'
import DateInput from '../ui/DateInput'

const EMPTY_PRIVATE = { effectiveDate: '', annualGrossSalary: '', label: '' }
const EMPTY_PUBLIC  = { effectiveDate: '', indiceMajore: '', label: '' }

export default function RevisionForm({ revision, contractType, onSubmit, onCancel }) {
  const isEdit   = Boolean(revision)
  const isPublic = contractType === 'PUBLIC'

  const [form, setForm]         = useState(isPublic ? EMPTY_PUBLIC : EMPTY_PRIVATE)
  const [grossPreview, setGrossPreview] = useState(null)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (revision) {
      setForm(isPublic ? {
        effectiveDate: revision.effectiveDate ?? '',
        indiceMajore:  revision.indiceMajore  ?? '',
        label:         revision.label         ?? '',
      } : {
        effectiveDate:    revision.effectiveDate    ?? '',
        annualGrossSalary: revision.annualGrossSalary ?? '',
        label:             revision.label             ?? '',
      })
    } else {
      setForm(isPublic ? EMPTY_PUBLIC : EMPTY_PRIVATE)
    }
  }, [revision, isPublic])

  // Aperçu temps réel du brut calculé depuis l'indice (PUBLIC uniquement)
  useEffect(() => {
    if (!isPublic) return
    const im   = parseInt(form.indiceMajore, 10)
    const date = form.effectiveDate || new Date().toISOString().slice(0, 10)
    if (!im || im < 1) { setGrossPreview(null); return }
    getPublicPointValue(date)
      .then(pv => setGrossPreview({ gross: im * pv, pointValue: pv }))
      .catch(() => setGrossPreview(null))
  }, [isPublic, form.indiceMajore, form.effectiveDate])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = isPublic ? {
        effectiveDate: form.effectiveDate,
        indiceMajore:  parseInt(form.indiceMajore, 10),
        label:         form.label || null,
      } : {
        effectiveDate:     form.effectiveDate,
        annualGrossSalary: parseFloat(form.annualGrossSalary),
        label:             form.label || null,
      }
      await onSubmit(payload)
    } catch (err) {
      const msg = err?.response?.data?.message
      setError(msg ?? 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier la révision' : 'Ajouter une révision salariale'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Date d'entrée en vigueur *</label>
            <DateInput name="effectiveDate" value={form.effectiveDate} onChange={val => setForm(f => ({ ...f, effectiveDate: val }))} required />
          </div>

          {isPublic ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nouvel indice majoré (IM) *</label>
              <input
                name="indiceMajore" type="number" min="1" step="1"
                value={form.indiceMajore} onChange={handleChange}
                required placeholder="Ex. : 435"
                className={inputCls}
              />
              {grossPreview != null ? (
                <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  Nouveau traitement brut annuel :{' '}
                  <strong>
                    {grossPreview.gross.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </strong>
                  {' '}({form.indiceMajore} × {grossPreview.pointValue.toFixed(4)} € — valeur du point en vigueur à cette date)
                </p>
              ) : form.indiceMajore && parseInt(form.indiceMajore, 10) >= 200 ? (
                <p className="text-xs text-gray-400">Calcul en cours…</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Salaire brut annuel (€) *</label>
              <input
                name="annualGrossSalary" type="number" min="1" step="0.01"
                value={form.annualGrossSalary} onChange={handleChange}
                required placeholder="48000.00"
                className={inputCls}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Libellé</label>
            <input
              name="label" type="text" value={form.label} onChange={handleChange}
              placeholder={isPublic ? "ex : Avancement d'échelon 2025, Changement de grade…" : 'ex : Augmentation annuelle 2025, Promotion…'}
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
