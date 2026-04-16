import { useState, useEffect } from 'react'
import { getUsers } from '../../api/users'
import { getAdminSnapshots, deleteAdminSnapshot } from '../../api/patrimoine'
import ManualSnapshotModal from './ManualSnapshotModal'

function fmt(value) {
  if (value == null) return '—'
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

function fmtDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AdminSnapshotPage() {
  const [users,           setUsers]           = useState([])
  const [selectedUserId,  setSelectedUserId]  = useState('')
  const [snapshots,       setSnapshots]       = useState([])
  const [loadingSnaps,    setLoadingSnaps]    = useState(false)
  const [loadingUsers,    setLoadingUsers]    = useState(true)
  const [error,           setError]           = useState(null)
  const [modalSnapshot,   setModalSnapshot]   = useState(undefined) // undefined = fermé, null = création, objet = édition

  // Chargement de la liste des utilisateurs au montage
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => setError('Impossible de charger les utilisateurs.'))
      .finally(() => setLoadingUsers(false))
  }, [])

  // Chargement des snapshots à la sélection d'un utilisateur
  useEffect(() => {
    if (!selectedUserId) { setSnapshots([]); return }
    fetchSnapshots()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  async function fetchSnapshots() {
    setLoadingSnaps(true)
    setError(null)
    try {
      setSnapshots(await getAdminSnapshots(selectedUserId))
    } catch {
      setError('Impossible de charger les relevés.')
    } finally {
      setLoadingSnaps(false)
    }
  }

  async function handleDelete(snap) {
    const dateStr = fmtDate(snap.snapshotDate)
    if (!confirm(`Supprimer le relevé du ${dateStr} ?`)) return
    try {
      await deleteAdminSnapshot(snap.id)
      setSnapshots(prev => prev.filter(s => s.id !== snap.id))
    } catch {
      setError('Erreur lors de la suppression.')
    }
  }

  function handleSaved() {
    fetchSnapshots()
  }

  const selectedUser = users.find(u => String(u.id) === String(selectedUserId))

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Relevés de patrimoine — Administration</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Créez ou modifiez manuellement les relevés d'un utilisateur.
          </p>
        </div>
        <button
          onClick={() => setModalSnapshot(null)}
          disabled={loadingUsers}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition flex items-center gap-2">
          <span>+</span> Ajouter manuellement un Relevé de patrimoine
        </button>
      </div>

      {/* Sélecteur d'utilisateur */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Sélectionner un utilisateur
        </label>
        {loadingUsers ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
          >
            <option value="">— Choisir un utilisateur —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.login})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Liste des relevés */}
      {selectedUserId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Relevés de {selectedUser?.firstName} {selectedUser?.lastName}
            </h3>
            <span className="text-sm text-gray-400">{snapshots.length} relevé{snapshots.length > 1 ? 's' : ''}</span>
          </div>

          {loadingSnaps && (
            <p className="text-sm text-gray-400 text-center py-10">Chargement des relevés…</p>
          )}

          {!loadingSnaps && snapshots.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              Aucun relevé pour cet utilisateur.
            </p>
          )}

          {!loadingSnaps && snapshots.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Investi</th>
                  <th className="text-right px-4 py-3 font-medium">Valeur</th>
                  <th className="text-right px-4 py-3 font-medium">Plus-value</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {snapshots.map(snap => {
                  const gain = parseFloat(snap.totalCapitalGainEur)
                  return (
                    <tr key={snap.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {fmtDate(snap.snapshotDate)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">
                        {fmt(snap.totalInvestedEur)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">
                        {fmt(snap.totalCurrentValueEur)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-semibold ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(snap.totalCapitalGainEur)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModalSnapshot(snap)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition">
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(snap)}
                            className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-md text-red-500 hover:bg-red-50 transition">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Modal création / édition */}
      {modalSnapshot !== undefined && (
        <ManualSnapshotModal
          users={users}
          snapshot={modalSnapshot}
          onClose={() => setModalSnapshot(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
