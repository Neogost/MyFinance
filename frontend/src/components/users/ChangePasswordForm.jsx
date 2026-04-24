import { useState } from 'react'
import { changePassword } from '../../api/users'
import FamilyGroupPanel from '../profile/FamilyGroupPanel'
import PersonalInfoPanel from '../profile/PersonalInfoPanel'
import SafetyNetPanel from '../profile/SafetyNetPanel'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'
const labelCls = 'text-sm font-semibold text-gray-700'

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

export default function ChangePasswordForm({ user, onGroupChange, onUserUpdate }) {
  const [form, setForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (PASSWORD_RULES.some(r => !r.test(form.newPassword))) {
      setError('Le nouveau mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (form.newPassword !== form.confirm) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword,
      })
      setSuccess(true)
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      const status = err.response?.status
      setError(status === 401
        ? 'Mot de passe actuel incorrect.'
        : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Mon profil</h2>
        <p className="text-sm text-gray-500 mb-6">
          Connecté en tant que <strong className="text-gray-700">{user.login}</strong>
          {' '}—{' '}
          <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs font-semibold">
            {user.role}
          </span>
        </p>

        <h3 className="text-base font-semibold text-gray-800 mb-4">Changer mon mot de passe</h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Mot de passe actuel *</label>
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Nouveau mot de passe *</label>
          <input
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            required
            className={inputCls}
          />
          <PasswordHints password={form.newPassword} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Confirmer le nouveau mot de passe *</label>
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={handleChange}
            required
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Mot de passe modifié avec succès.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Enregistrement…' : 'Changer le mot de passe'}
        </button>
      </form>
      </div>

      <PersonalInfoPanel user={user} onUpdate={onUserUpdate} />
      <FamilyGroupPanel onGroupChange={onGroupChange} />
      <SafetyNetPanel user={user} onUpdate={onUserUpdate} />
    </div>
  )
}
