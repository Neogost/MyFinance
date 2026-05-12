import { useState } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { updatePersonalInfo } from '../../api/auth'
import { labelCls } from '../../components/common/formStyles.js'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'

function FieldTooltip({ text }) {
  return (
    <span className="relative group ml-1.5 cursor-help inline-flex items-center">
      <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 text-xs text-white bg-gray-800 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-lg leading-relaxed">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  )
}

export default function PersonalInfoPanel({ user, onUpdate }) {
  const [form, setForm] = useState({
    firstName:       user.firstName       ?? '',
    lastName:        user.lastName        ?? '',
    birthDate:       user.birthDate       ?? '',
    birthPlace:      user.birthPlace      ?? '',
    birthPostalCode: user.birthPostalCode ?? '',
    jobTitle:        user.jobTitle        ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const { trackEvent } = useAnalytics()
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setSuccess(false)
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePersonalInfo({
        firstName:       form.firstName.trim(),
        lastName:        form.lastName.trim(),
        birthDate:       form.birthDate       || null,
        birthPlace:      form.birthPlace      || null,
        birthPostalCode: form.birthPostalCode || null,
        jobTitle:        form.jobTitle        || null,
      })
      onUpdate?.(updated)
      setSuccess(true)
      trackEvent('FORM_SUBMIT', 'auth.profile.update_personal')
    } catch {
      setError('Impossible d\'enregistrer les informations.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
      <h3 className="text-base font-semibold text-gray-800 mb-1">Informations personnelles</h3>
      <p className="text-sm text-gray-500 mb-6">
        Utilisées pour la déclaration de patrimoine et l'affichage de votre profil.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Prénom *<FieldTooltip text="Affiché dans la navigation et dans les rapports (bilan financier, déclaration de patrimoine)." /></label>
          <input name="firstName" type="text" value={form.firstName}
            onChange={handleChange} placeholder="Kévin"
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Nom *<FieldTooltip text="Affiché dans la navigation et dans les rapports (bilan financier, déclaration de patrimoine)." /></label>
          <input name="lastName" type="text" value={form.lastName}
            onChange={handleChange} placeholder="Dupont"
            className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Date de naissance<FieldTooltip text="Utilisée pour : votre tranche d'âge dans les déciles INSEE de patrimoine, votre âge de départ dans le simulateur de retraite, et le calcul des cycles de donation dans la Stratégie 15 ans (onglet Donation & succession)." /></label>
          <input name="birthDate" type="date" value={form.birthDate}
            onChange={handleChange}
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Poste actuel<FieldTooltip text="Affiché dans votre profil et utilisé dans la déclaration de patrimoine." /></label>
          <input name="jobTitle" type="text" value={form.jobTitle}
            onChange={handleChange} placeholder="ex : Ingénieur logiciel"
            className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Commune de naissance<FieldTooltip text="Requise pour la déclaration de patrimoine (section Passifs & dettes)." /></label>
          <input name="birthPlace" type="text" value={form.birthPlace}
            onChange={handleChange} placeholder="Paris"
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={`${labelCls} flex items-center`}>Code postal de naissance<FieldTooltip text="Requis pour la déclaration de patrimoine (section Passifs & dettes)." /></label>
          <input name="birthPostalCode" type="text" value={form.birthPostalCode}
            onChange={handleChange} placeholder="75001"
            className={inputCls} />
        </div>
      </div>

      {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">Informations enregistrées.</p>}

      <button onClick={handleSave} disabled={saving}
        className="py-2.5 px-6 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}
