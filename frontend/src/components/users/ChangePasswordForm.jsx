import { useState, useEffect } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { changePassword } from '../../api/users'
import FamilyGroupPanel from '../profile/FamilyGroupPanel'
import FiscalProfilePanel from '../profile/FiscalProfilePanel'
import PersonalInfoPanel from '../profile/PersonalInfoPanel'
import SafetyNetPanel from '../profile/SafetyNetPanel'
import AnalyticsOptOutPanel from '../profile/AnalyticsOptOutPanel'
import AchievementsPanel from '../profile/AchievementsPanel'
import DeleteAccountModal from '../profile/DeleteAccountModal'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'
const labelCls = 'text-sm font-semibold text-gray-700'

const PASSWORD_RULES = [
  { test: p => p.length >= 12,        label: '12 caractères minimum' },
  { test: p => /[A-Z]/.test(p),       label: 'Une majuscule' },
  { test: p => /[a-z]/.test(p),       label: 'Une minuscule' },
  { test: p => /\d/.test(p),          label: 'Un chiffre' },
  { test: p => /[^A-Za-z0-9]/.test(p), label: 'Un caractère spécial' },
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

export default function ChangePasswordForm({ user, onGroupChange, onUserUpdate, onAccountDeleted }) {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('auth.profile') }, [])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteMode,      setDeleteMode]      = useState('account') // 'account' | 'data-only'
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
      trackEvent('FORM_SUBMIT', 'auth.profile.change_password')
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
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

      {/* Hauts faits — pleine largeur */}
      <AchievementsPanel />

      {/* Infos personnelles + Fiscal — 2 colonnes sur lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PersonalInfoPanel user={user} onUpdate={onUserUpdate} />
        <FiscalProfilePanel user={user} onUpdate={onUserUpdate} />
      </div>

      {/* Famille + Matelas — 2 colonnes sur lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FamilyGroupPanel onGroupChange={onGroupChange} />
        <SafetyNetPanel user={user} onUpdate={onUserUpdate} />
      </div>

      <AnalyticsOptOutPanel user={user} onUpdate={onUserUpdate} />

      {/* Zone de danger */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-100">
        <h2 className="text-base font-semibold text-red-700 mb-2">Zone de danger</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ces actions sont définitives et irréversibles. Toutes vos données seront effacées immédiatement.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { trackEvent('BUTTON_CLICK', 'auth.profile.open_delete_data'); setDeleteMode('data-only'); setShowDeleteModal(true) }}
            className="px-4 py-2 text-sm font-medium text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition"
          >
            Supprimer uniquement mes données
          </button>
          <button
            onClick={() => { trackEvent('BUTTON_CLICK', 'auth.profile.open_delete_account'); setDeleteMode('account'); setShowDeleteModal(true) }}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
          >
            Supprimer mon compte et mes données
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          user={user}
          mode={deleteMode}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={deleteMode === 'data-only'
            ? () => { setShowDeleteModal(false); window.location.reload() }
            : onAccountDeleted}
        />
      )}
    </div>
  )
}
