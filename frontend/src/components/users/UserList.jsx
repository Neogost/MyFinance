import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users'
import UserForm from './UserForm'

export default function UserList() {
  const [users, setUsers]           = useState([])
  const [userToEdit, setUserToEdit] = useState(null)   // null = fermé, objet vide = création
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      setUsers(await getUsers())
    } catch {
      setError('Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(formData) {
    if (userToEdit?.id) {
      const updated = await updateUser(userToEdit.id, formData)
      setUsers(us => us.map(u => u.id === updated.id ? updated : u))
    } else {
      const created = await createUser(formData)
      setUsers(us => [...us, created])
    }
    setUserToEdit(null)
  }

  async function handleDelete(user) {
    if (!confirm(`Supprimer l'utilisateur « ${user.login} » ?`)) return
    await deleteUser(user.id)
    setUsers(us => us.filter(u => u.id !== user.id))
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h2>
        <button
          onClick={() => setUserToEdit({})}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Login</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prénom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rôle</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm text-gray-800">{u.login}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{u.firstName}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{u.lastName}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs font-semibold">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => setUserToEdit(u)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userToEdit !== null && (
        <UserForm
          userToEdit={userToEdit?.id ? userToEdit : null}
          onSubmit={handleSubmit}
          onCancel={() => setUserToEdit(null)}
        />
      )}
    </div>
  )
}
