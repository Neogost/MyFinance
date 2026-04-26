import { useState } from 'react'
import { updateFiscalProfile } from '../../api/auth'

const inputCls = 'px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'

export default function FiscalProfilePanel({ user, onUpdate }) {
  const [fiscalParts,     setFiscalParts]     = useState(user.fiscalParts               ?? '')
  const [flatRate,        setFlatRate]        = useState(user.useFlatRateDeduction       ?? true)
  const [deduction,       setDeduction]       = useState(user.customProfessionalDeduction ?? '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await updateFiscalProfile({
        fiscalParts:                fiscalParts !== '' ? parseFloat(fiscalParts) : null,
        useFlatRateDeduction:       flatRate,
        customProfessionalDeduction: !flatRate && deduction !== '' ? parseFloat(deduction) : null,
      })
      onUpdate?.(updated)
      setSuccess(true)
    } catch {
      setError('Impossible d\'enregistrer le profil fiscal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Profil fiscal</h3>
      <p className="text-sm text-gray-500 mb-6">
        Utilisé pour le simulateur d'impôts et le calcul du net d'impôt sur vos contrats.
      </p>

      {/* Parts fiscales */}
      <div className="flex flex-col gap-1.5 mb-5">
        <label className="text-sm font-semibold text-gray-700">Nombre de parts fiscales</label>
        <div className="relative w-40">
          <input
            type="number" min="1" max="10" step="0.25"
            value={fiscalParts}
            onChange={e => { setFiscalParts(e.target.value); setSuccess(false) }}
            placeholder="ex : 1.0"
            className={`${inputCls} w-full pr-16`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">parts</span>
        </div>
        <p className="text-xs text-gray-400">1 part = célibataire, 2 = couple, +0.5 par enfant à charge</p>
      </div>

      {/* Abattement */}
      <div className="flex flex-col gap-2 mb-5">
        <label className="text-sm font-semibold text-gray-700">Déduction professionnelle</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" checked={flatRate === true}
              onChange={() => { setFlatRate(true); setDeduction(''); setSuccess(false) }}
              className="accent-indigo-600" />
            <span className="text-sm text-gray-700">Abattement forfaitaire 10 %</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" checked={flatRate === false}
              onChange={() => { setFlatRate(false); setSuccess(false) }}
              className="accent-indigo-600" />
            <span className="text-sm text-gray-700">Frais réels</span>
          </label>
        </div>
      </div>

      {/* Frais réels */}
      {flatRate === false && (
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-semibold text-gray-700">Montant des frais réels</label>
          <div className="relative w-52">
            <input
              type="number" min="0" step="100"
              value={deduction}
              onChange={e => { setDeduction(e.target.value); setSuccess(false) }}
              placeholder="ex : 3500"
              className={`${inputCls} w-full pr-8`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
          </div>
        </div>
      )}

      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">Profil fiscal enregistré.</p>}

      <button onClick={handleSave} disabled={saving}
        className="py-2.5 px-6 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
