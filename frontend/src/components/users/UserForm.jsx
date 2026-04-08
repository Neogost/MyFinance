import { useState, useEffect } from 'react'

const EMPTY_FORM = {
  firstName: '', lastName: '', birthDate: '', login: '', password: '', role: 'USER',
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white'
const labelCls = 'text-sm font-semibold text-gray-700'

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
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
