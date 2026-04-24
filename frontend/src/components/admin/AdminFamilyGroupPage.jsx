import { useState, useEffect } from 'react'
import { adminGetAllGroups, adminDissolveGroup, adminRemoveMember } from '../../api/familyGroup'

export default function AdminFamilyGroupPage() {
  const [groups,    setGroups]    = useState([])
  const [expanded,  setExpanded]  = useState(new Set())
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      setGroups(await adminGetAllGroups())
    } catch {
      setError('Impossible de charger les groupes.')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id) {
    setExpanded(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDissolve(group) {
    if (!confirm(`Supprimer le groupe « ${group.name} » et retirer tous ses membres ?`)) return
    try {
      await adminDissolveGroup(group.id)
      setGroups(gs => gs.filter(g => g.id !== group.id))
    } catch {
      setError('Impossible de supprimer le groupe.')
    }
  }

  async function handleRemoveMember(group, member) {
    if (!confirm(`Retirer ${member.firstName} ${member.lastName} du groupe « ${group.name} » ?`)) return
    try {
      await adminRemoveMember(group.id, member.id)
      setGroups(gs => gs.map(g => g.id !== group.id ? g : {
        ...g,
        members: g.members.filter(m => m.id !== member.id)
      }))
    } catch {
      setError('Impossible de retirer ce membre.')
    }
  }

  function formatDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Regroupements familiaux</h2>
        <span className="text-sm text-gray-500 shrink-0">{groups.length} groupe{groups.length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun groupe</p>
          <p className="text-sm">Les groupes sont créés par les utilisateurs depuis leur profil.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-xl shadow-sm overflow-hidden">

              {/* ── En-tête du groupe ── */}
              <div
                className="flex items-start gap-3 px-4 md:px-5 py-3 md:py-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleExpand(group.id)}
              >
                <span className="text-sm font-medium text-gray-400 mt-0.5 shrink-0">
                  {expanded.has(group.id) ? '▼' : '▶'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-semibold text-gray-900">{group.name}</p>
                    <span className="text-xs text-gray-500 shrink-0">
                      {group.members?.length ?? 0} membre{(group.members?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {group.invitations?.filter(i => i.status === 'PENDING').length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                        {group.invitations.filter(i => i.status === 'PENDING').length} invitation{group.invitations.filter(i => i.status === 'PENDING').length > 1 ? 's' : ''} en attente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Owner : {group.owner.firstName} {group.owner.lastName}
                    <span className="hidden sm:inline"> ({group.owner.login})</span>
                    {' · '}Créé le {formatDate(group.createdAt)}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDissolve(group) }}
                  className="shrink-0 px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition"
                >
                  Supprimer
                </button>
              </div>

              {/* ── Détail dépliable ── */}
              {expanded.has(group.id) && (
                <div className="border-t border-gray-100 px-4 md:px-5 py-4 flex flex-col gap-4">

                  {/* Membres */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Membres</p>
                    <div className="flex flex-col gap-1">
                      {group.members?.map(m => (
                        <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <MemberDot memberId={m.id} />
                            <span className="text-sm text-gray-800 truncate">{m.firstName} {m.lastName}</span>
                            <span className="hidden sm:inline text-xs text-gray-400 shrink-0">({m.login})</span>
                            {m.id === group.owner.id && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Owner</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMember(group, m)}
                            className="px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-500 hover:border-red-400 hover:text-red-600 transition"
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invitations en cours */}
                  {group.invitations?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invitations</p>
                      <div className="flex flex-col gap-1">
                        {group.invitations.map(inv => (
                          <div key={inv.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm gap-2">
                            <span className="text-gray-700 truncate">
                              {inv.invitedUser.firstName} {inv.invitedUser.lastName}
                              <span className="hidden sm:inline text-gray-400"> ({inv.invitedUser.login})</span>
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              inv.status === 'PENDING'  ? 'bg-amber-100 text-amber-700'  :
                              inv.status === 'ACCEPTED' ? 'bg-green-100 text-green-700'  :
                                                          'bg-gray-100  text-gray-500'
                            }`}>
                              {inv.status === 'PENDING' ? 'En attente' : inv.status === 'ACCEPTED' ? 'Acceptée' : 'Refusée'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MEMBER_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500',   'bg-cyan-500',    'bg-orange-500', 'bg-teal-500',
]

function MemberDot({ memberId }) {
  const color = MEMBER_COLORS[memberId % MEMBER_COLORS.length]
  return <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
}
