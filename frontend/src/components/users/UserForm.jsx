import { useState, useEffect } from 'react'
import { inputCls, labelCls } from '../../components/common/formStyles.js'

const EMPTY_FORM = {
  firstName: '', lastName: '', birthDate: '', login: '', password: '', role: 'USER',
  fiscalParts: '1.0', useFlatRateDeduction: true, customProfessionalDeduction: '',
}

const PASSWORD_RULES = [
  { test: p => p.length >= 8,   label: '8 caractères minimum' },
  { test: p => /[A-Z]/.test(p), label: 'Une majuscule' },
  { test: p => /[a-z]/.test(p), label: 'Une minuscule' },
  { test: p => /\d/.test(p),    label: 'Un chiffre' },
]

function PasswordHints({ password }) {
  if (!password) return null
  return (
    <ul className="flex flex-col gap-1 mt-1">
      {PASSWORD_RULES.map(({ test, label }) => {
        const ok = test(password)
        return (
          <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
            <span className="font-bold">{ok ? '✓' : '○'}</span>
            {label}
          </li>
        )
      })}
    </ul>
  )
}

export default function UserForm({ userToEdit, onSubmit, onCancel }) {
  const isEdit = Boolean(userToEdit)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userToEdit) {
      setForm({
        firstName:                 userToEdit.firstName                 ?? '',
        lastName:                  userToEdit.lastName                  ?? '',
        birthDate:                 userToEdit.birthDate                 ?? '',
        login:                     userToEdit.login                     ?? '',
        password:                  '',
        role:                      userToEdit.role                      ?? 'USER',
        fiscalParts:               userToEdit.fiscalParts               ?? '1.0',
        useFlatRateDeduction:      userToEdit.useFlatRateDeduction      ?? true,
        customProfessionalDeduction: userToEdit.customProfessionalDeduction ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [userToEdit])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'useFlatRateDeduction' && checked ? { customProfessionalDeduction: '' } : {}),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (form.password && PASSWORD_RULES.some(r => !r.test(form.password))) {
      setError('Le mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    setLoading(true)
    try {
      // En édition, on n'envoie le mot de passe que s'il est renseigné
      const payload = {
        ...form,
        fiscalParts: form.fiscalParts !== '' ? parseFloat(form.fiscalParts) : null,
        customProfessionalDeduction: form.customProfessionalDeduction !== ''
          ? parseFloat(form.customProfessionalDeduction)
          : null,
      }
      if (isEdit && !payload.password) delete payload.password
      await onSubmit(payload)
    } catch (err) {
      const status = err.response?.status
      setError(status === 409 ? 'Ce login est déjà utilisé.' : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-8 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          {isEdit ? 'Modifier un utilisateur' : 'Créer un utilisateur'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prénom *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nom *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Login *</label>
            <input name="login" value={form.login} onChange={handleChange} required className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              {isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEdit}
              className={inputCls}
            />
            <PasswordHints password={form.password} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Date de naissance</label>
            <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Rôle *</label>
            <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
              <option value="USER">Utilisateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          {/* ── Profil fiscal ── */}
          <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profil fiscal</p>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Quotient familial (parts)</label>
              <input
                name="fiscalParts" type="number" min="1" max="10" step="0.25"
                value={form.fiscalParts} onChange={handleChange}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>Type d'abattement professionnel</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio" name="useFlatRateDeduction" value="true"
                  checked={form.useFlatRateDeduction === true}
                  onChange={() => setForm(f => ({ ...f, useFlatRateDeduction: true, customProfessionalDeduction: '' }))}
                  className="accent-indigo-600"
                />
                Forfaitaire 10% (défaut)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio" name="useFlatRateDeduction" value="false"
                  checked={form.useFlatRateDeduction === false}
                  onChange={() => setForm(f => ({ ...f, useFlatRateDeduction: false }))}
                  className="accent-indigo-600"
                />
                Frais réels
              </label>
            </div>

            {form.useFlatRateDeduction === false && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Montant des frais réels (€)</label>
                <input
                  name="customProfessionalDeduction" type="number" min="0" step="1"
                  value={form.customProfessionalDeduction} onChange={handleChange}
                  placeholder="ex : 8000"
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
