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

  if (loading) return <p>Chargement…</p>
  if (error)   return <p className="error">{error}</p>

  return (
    <div>
      <div className="page-header">
        <h2>Gestion des utilisateurs</h2>
        <button onClick={() => setUserToEdit({})}>+ Nouvel utilisateur</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Login</th>
            <th>Prénom</th>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.login}</td>
              <td>{u.firstName}</td>
              <td>{u.lastName}</td>
              <td><span className="role-badge">{u.role}</span></td>
              <td className="actions">
                <button className="btn-sm" onClick={() => setUserToEdit(u)}>Modifier</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(u)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
