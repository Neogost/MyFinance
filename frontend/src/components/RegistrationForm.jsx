import { useState } from 'react'
import { submitRegistration } from '../api/registrations'

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition'
const labelCls = 'text-sm font-semibold text-gray-700'

const PASSWORD_RULES = [
  { test: p => p.length >= 8,   label: '8 caractères minimum' },
  { test: p => /[A-Z]/.test(p), label: 'Une majuscule' },
  { test: p => /[a-z]/.test(p), label: 'Une minuscule' },
  { test: p => /\d/.test(p),    label: 'Un chiffre' },
]

export default function RegistrationForm({ onBack }) {
  const [form, setForm]     = useState({ login: '', firstName: '', lastName: '', password: '', confirm: '' })
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (PASSWORD_RULES.some(r => !r.test(form.password))) {
      setError('Le mot de passe ne respecte pas les règles de sécurité.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await submitRegistration({
        login:     form.login,
        firstName: form.firstName,
        lastName:  form.lastName,
        password:  form.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.status === 409
        ? 'Ce login est déjà utilisé ou une demande est déjà en attente.'
        : 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-10 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée</h2>
          <p className="text-sm text-gray-500 mb-6">
            Votre demande a été transmise. Un administrateur la traitera prochainement.
            Vous recevrez un accès une fois votre compte validé.
          </p>
          <button
            onClick={onBack}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 md:p-10 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Créer un compte</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Votre demande sera validée par un administrateur</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Prénom *</label>
              <input
                name="firstName" value={form.firstName} onChange={handleChange}
                required autoFocus className={inputCls} placeholder="Jean"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nom *</label>
              <input
                name="lastName" value={form.lastName} onChange={handleChange}
                required className={inputCls} placeholder="Dupont"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Login *</label>
            <input
              name="login" value={form.login} onChange={handleChange}
              required className={inputCls} placeholder="jean.dupont"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Mot de passe *</label>
            <input
              name="password" type="password" value={form.password} onChange={handleChange}
              required className={inputCls} placeholder="••••••••"
            />
            {form.password && (
              <ul className="flex flex-col gap-1 mt-1">
                {PASSWORD_RULES.map(({ test, label }) => {
                  const ok = test(form.password)
                  return (
                    <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className="font-bold">{ok ? '✓' : '○'}</span>
                      {label}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Confirmer le mot de passe *</label>
            <input
              name="confirm" type="password" value={form.confirm} onChange={handleChange}
              required className={inputCls} placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="mt-1 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Envoi…' : 'Envoyer la demande'}
          </button>

          <button
            type="button" onClick={onBack}
            className="text-sm text-gray-500 hover:text-indigo-600 transition text-center"
          >
            ← Retour à la connexion
          </button>
        </form>
      </div>
    </div>
  )
}
