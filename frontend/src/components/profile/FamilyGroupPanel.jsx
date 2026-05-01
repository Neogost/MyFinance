import { useState, useEffect } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  getMyGroup, createGroup, renameGroup, dissolveGroup, leaveGroup,
  removeMember, sendInvitation, getPendingInvitations, acceptInvitation, refuseInvitation
} from '../../api/familyGroup'
import { inputCls, labelCls } from '../../components/common/formStyles.js'

export default function FamilyGroupPanel({ onGroupChange }) {
  const [group,       setGroup]       = useState(undefined) // undefined = chargement, null = pas de groupe
  const [invitations, setInvitations] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const [createName,  setCreateName]  = useState('')
  const [renameName,  setRenameName]  = useState('')
  const [inviteLogin, setInviteLogin] = useState('')
  const [inviteInfo,  setInviteInfo]  = useState(null)
  const [showRename,  setShowRename]  = useState(false)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => { fetchAll() }, [])

  const { trackEvent } = useAnalytics()

  async function fetchAll() {
    try {
      setLoading(true)
      const [g, invs] = await Promise.all([getMyGroup(), getPendingInvitations()])
      setGroup(g)
      setInvitations(invs)
      if (g) setRenameName(g.name)
    } catch {
      setError('Impossible de charger les données du groupe.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const g = await createGroup({ name: createName })
      setGroup(g)
      setRenameName(g.name)
      setCreateName('')
      onGroupChange?.(g)
      trackEvent('FEATURE_USE', 'family.group.create')
    } catch {
      setError('Impossible de créer le groupe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const g = await renameGroup({ name: renameName })
      setGroup(g)
      setShowRename(false)
      onGroupChange?.(g)
      trackEvent('FEATURE_USE', 'family.group.rename')
    } catch {
      setError('Impossible de renommer le groupe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDissolve() {
    if (!confirm(`Dissoudre le groupe « ${group.name} » ? Tous les membres seront retirés.`)) return
    setSaving(true)
    try {
      await dissolveGroup()
      setGroup(null)
      onGroupChange?.(null)
      trackEvent('FEATURE_USE', 'family.group.dissolve')
    } catch {
      setError('Impossible de dissoudre le groupe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLeave() {
    if (!confirm('Quitter le groupe ?')) return
    setSaving(true)
    try {
      await leaveGroup()
      setGroup(null)
      onGroupChange?.(null)
      trackEvent('FEATURE_USE', 'family.group.leave')
    } catch {
      setError('Impossible de quitter le groupe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(member) {
    if (!confirm(`Retirer ${member.firstName} ${member.lastName} du groupe ?`)) return
    try {
      await removeMember(member.id)
      setGroup(g => ({ ...g, members: g.members.filter(m => m.id !== member.id) }))
      trackEvent('FEATURE_USE', 'family.group.remove_member')
    } catch {
      setError('Impossible de retirer ce membre.')
    }
  }

  async function handleSendInvitation(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInviteInfo(null)
    try {
      // Anti-énumération (M15) : le backend renvoie 202 + message générique sans
      // confirmer l'existence du login. On re-fetch le groupe pour vérifier si
      // l'invitation a réellement été créée (visible dans group.invitations).
      await sendInvitation({ login: inviteLogin })
      const refreshed = await getMyGroup()
      setGroup(refreshed)
      setInviteLogin('')
      trackEvent('FEATURE_USE', 'family.invitation.send')
      setInviteInfo('Si l\'utilisateur existe et n\'a pas déjà été invité, il recevra l\'invitation.')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg || 'Impossible d\'envoyer l\'invitation.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAccept(inv) {
    try {
      const g = await acceptInvitation(inv.id)
    trackEvent('FEATURE_USE', 'family.invitation.accept')
      setGroup(g)
      setInvitations(is => is.filter(i => i.id !== inv.id))
      onGroupChange?.(g)
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg || 'Impossible d\'accepter l\'invitation.')
    }
  }

  async function handleRefuse(inv) {
    try {
      await refuseInvitation(inv.id)
    trackEvent('FEATURE_USE', 'family.invitation.refuse')
      setInvitations(is => is.filter(i => i.id !== inv.id))
    } catch {
      setError('Impossible de refuser l\'invitation.')
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Chargement…</p>

  const isOwner = group && group.owner && group.members?.some(m => m.id === group.owner.id)
      && group.owner.login === group.members?.find(m => m.id === group.owner.id)?.login

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 flex flex-col gap-6">
      <h3 className="text-base font-bold text-gray-900">Regroupement familial</h3>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {inviteInfo && !error && (
        <p className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">{inviteInfo}</p>
      )}

      {/* ── Invitations reçues ── */}
      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={labelCls}>Invitations reçues</p>
          {invitations.map(inv => (
            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{inv.groupName}</p>
                <p className="text-xs text-gray-500">Invité par {inv.ownerFirstName} {inv.ownerLastName}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(inv)}
                  className="flex-1 sm:flex-none px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  Accepter
                </button>
                <button
                  onClick={() => handleRefuse(inv)}
                  className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-400 hover:text-red-600 transition"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cas 1 : aucun groupe ── */}
      {!group && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">Vous n'appartenez à aucun groupe. Créez-en un pour partager votre vue patrimoniale.</p>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Nom du groupe *</label>
            <input
              type="text"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="ex : Famille Desmay"
              required
              className={inputCls}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {saving ? 'Création…' : 'Créer le groupe'}
            </button>
          </div>
        </form>
      )}

      {/* ── Cas 2 & 3 : membre ou owner ── */}
      {group && (
        <div className="flex flex-col gap-5">

          {/* En-tête groupe */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {showRename ? (
              <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={renameName}
                  onChange={e => setRenameName(e.target.value)}
                  required
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition flex-1"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRename(false); setRenameName(group.name) }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-gray-400 transition"
                >
                  Annuler
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <p className="font-semibold text-gray-900">{group.name}</p>
                <span className="text-xs text-gray-400">Owner : {group.owner.firstName} {group.owner.lastName}</span>
              </div>
            )}
            {!showRename && isOwner && (
              <button
                onClick={() => setShowRename(true)}
                className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
              >
                Renommer
              </button>
            )}
          </div>

          {/* Liste des membres */}
          <div>
            <p className={labelCls + ' mb-2'}>Membres ({group.members?.length ?? 0})</p>
            <div className="flex flex-col gap-1">
              {group.members?.map(m => (
                <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MemberBadge memberId={m.id} />
                    <span className="text-sm text-gray-800">{m.firstName} {m.lastName}</span>
                    {m.id === group.owner.id && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">Owner</span>
                    )}
                  </div>
                  {isOwner && m.id !== group.owner.id && (
                    <button
                      onClick={() => handleRemoveMember(m)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs text-gray-500 hover:border-red-400 hover:text-red-600 transition"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invitations envoyées (owner uniquement) */}
          {isOwner && (
            <div className="flex flex-col gap-3">
              <p className={labelCls}>Inviter un utilisateur</p>
              <form onSubmit={handleSendInvitation} className="flex gap-2">
                <input
                  type="text"
                  value={inviteLogin}
                  onChange={e => setInviteLogin(e.target.value)}
                  placeholder="Login de l'utilisateur"
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  Inviter
                </button>
              </form>

              {/* Invitations envoyées en attente */}
              {group.invitations?.filter(i => i.status === 'PENDING').length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">En attente de réponse</p>
                  {group.invitations.filter(i => i.status === 'PENDING').map(inv => (
                    <div key={inv.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                      <span>⏳</span>
                      <span>{inv.invitedUser.firstName} {inv.invitedUser.lastName} ({inv.invitedUser.login})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end border-t border-gray-100 pt-4">
            {isOwner ? (
              <button
                onClick={handleDissolve}
                disabled={saving}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-60 transition"
              >
                Dissoudre le groupe
              </button>
            ) : (
              <button
                onClick={handleLeave}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:border-red-400 hover:text-red-600 disabled:opacity-60 transition"
              >
                Quitter le groupe
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const MEMBER_COLORS = [
  'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500',   'bg-cyan-500',    'bg-orange-500', 'bg-teal-500',
]

function MemberBadge({ memberId }) {
  const color = MEMBER_COLORS[memberId % MEMBER_COLORS.length]
  return <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
}
