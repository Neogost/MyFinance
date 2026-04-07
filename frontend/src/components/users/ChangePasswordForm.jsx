import { useState } from 'react'
import { changePassword } from '../../api/users'

export default function ChangePasswordForm({ user }) {
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
    <div className="profile-card">
      <h2>Mon profil</h2>
      <p>Connecté en tant que <strong>{user.login}</strong> — <span className="role-badge">{user.role}</span></p>

      <h3>Changer mon mot de passe</h3>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="field">
          <label>Mot de passe actuel *</label>
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Nouveau mot de passe *</label>
          <input
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label>Confirmer le nouveau mot de passe *</label>
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={handleChange}
            required
          />
        </div>

        {error   && <p className="error">{error}</p>}
        {success && <p className="success">Mot de passe modifié avec succès.</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Enregistrement…' : 'Changer le mot de passe'}
        </button>
      </form>
    </div>
  )
}
