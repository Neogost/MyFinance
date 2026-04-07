import { useState, useEffect } from 'react'

const EMPTY_FORM = {
  firstName: '', lastName: '', birthDate: '', login: '', password: '', role: 'USER',
}

export default function UserForm({ userToEdit, onSubmit, onCancel }) {
  const isEdit = Boolean(userToEdit)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userToEdit) {
      setForm({
        firstName: userToEdit.firstName ?? '',
        lastName:  userToEdit.lastName  ?? '',
        birthDate: userToEdit.birthDate ?? '',
        login:     userToEdit.login     ?? '',
        password:  '',
        role:      userToEdit.role      ?? 'USER',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [userToEdit])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // En édition, on n'envoie le mot de passe que s'il est renseigné
      const payload = { ...form }
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
    <div className="modal-overlay">
      <div className="modal">
        <h2>{isEdit ? 'Modifier un utilisateur' : 'Créer un utilisateur'}</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-row">
            <div className="field">
              <label>Prénom *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>Nom *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="field">
            <label>Login *</label>
            <input name="login" value={form.login} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>{isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEdit}
            />
          </div>

          <div className="field">
            <label>Date de naissance</label>
            <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Rôle *</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="USER">Utilisateur</option>
              <option value="ADMIN">Administrateur</option>
            </select>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>Annuler</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
