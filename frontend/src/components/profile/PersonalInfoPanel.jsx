import { useState } from 'react'
import { updatePersonalInfo } from '../../api/auth'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'
const labelCls = 'text-sm font-semibold text-gray-700'

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
          <label className={labelCls}>Prénom *</label>
          <input name="firstName" type="text" value={form.firstName}
            onChange={handleChange} placeholder="Kévin"
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Nom *</label>
          <input name="lastName" type="text" value={form.lastName}
            onChange={handleChange} placeholder="Dupont"
            className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Date de naissance</label>
          <input name="birthDate" type="date" value={form.birthDate}
            onChange={handleChange}
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Poste actuel</label>
          <input name="jobTitle" type="text" value={form.jobTitle}
            onChange={handleChange} placeholder="ex : Ingénieur logiciel"
            className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Commune de naissance</label>
          <input name="birthPlace" type="text" value={form.birthPlace}
            onChange={handleChange} placeholder="Paris"
            className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Code postal de naissance</label>
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
