import { useState, useEffect } from 'react'
import { getAdminBanners, deleteBanner } from '../../api/infoBanners'
import InfoBannerForm from './InfoBannerForm'
import { useAnalytics } from '../../hooks/useAnalytics'

const TYPE_LABELS = {
  ALERT: 'Alerte', WARNING: 'Avertissement', MAINTENANCE: 'Maintenance',
  INFO: 'Information', SUCCESS: 'Succès',
}
const TYPE_BADGE = {
  ALERT:       'bg-red-100 text-red-700 dark:text-red-300',
  WARNING:     'bg-orange-100 text-orange-700 dark:text-orange-300',
  MAINTENANCE: 'bg-gray-100 text-gray-700',
  INFO:        'bg-blue-100 text-blue-700 dark:text-blue-300',
  SUCCESS:     'bg-green-100 text-green-700 dark:text-green-300',
}
const STATUS_BADGE = {
  ACTIVE:    'bg-green-100 text-green-700 dark:text-green-300',
  SCHEDULED: 'bg-indigo-100 text-indigo-700 dark:text-indigo-300',
  EXPIRED:   'bg-gray-100 text-gray-500',
}
const STATUS_LABELS = { ACTIVE: 'Active', SCHEDULED: 'Programmée', EXPIRED: 'Expirée' }
const AUDIENCE_LABELS = { ALL: 'Tous', USERS_ONLY: 'Utilisateurs', ADMIN_ONLY: 'Admins' }

function formatDatetime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function BannerTable({ banners, onEdit, onDelete }) {
  if (banners.length === 0) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Titre / Message</th>
            <th className="pb-2 pr-4">Audience</th>
            <th className="pb-2 pr-4">Début</th>
            <th className="pb-2 pr-4">Fin</th>
            <th className="pb-2 pr-4">Statut</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {banners.map(b => (
            <tr key={b.id} className="hover:bg-gray-50 transition">
              <td className="py-2.5 pr-4">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[b.type]}`}>
                  {TYPE_LABELS[b.type]}
                </span>
              </td>
              <td className="py-2.5 pr-4 max-w-xs">
                {b.title && <div className="font-medium text-gray-900 truncate">{b.title}</div>}
                <div className="text-gray-500 truncate text-xs">{b.message}</div>
              </td>
              <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">
                {AUDIENCE_LABELS[b.audience]}
              </td>
              <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{formatDatetime(b.startAt)}</td>
              <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{b.endAt ? formatDatetime(b.endAt) : '∞'}</td>
              <td className="py-2.5 pr-4">
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status]}`}>
                  {STATUS_LABELS[b.status]}
                </span>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => onEdit(b)}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onDelete(b)}
                    className="text-xs text-red-500 hover:underline font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, count, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        {title}
        {count > 0 && (
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </h3>
      {count === 0 ? (
        <p className="text-sm text-gray-400 italic">Aucune bannière.</p>
      ) : (
        children
      )}
    </div>
  )
}

export default function InfoBannerAdminPage() {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('admin.info_banners') }, [])

  const [banners,    setBanners]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [formTarget, setFormTarget] = useState(undefined) // undefined=fermé | null=création | objet=édition

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      setError(null)
      setBanners(await getAdminBanners())
    } catch {
      setError('Impossible de charger les bannières.')
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(saved) {
    setBanners(bs => {
      const exists = bs.find(b => b.id === saved.id)
      return exists ? bs.map(b => b.id === saved.id ? saved : b) : [saved, ...bs]
    })
    setFormTarget(undefined)
  }

  async function handleDelete(banner) {
    if (!confirm(`Supprimer la bannière « ${banner.title ?? banner.message.slice(0, 50)} » ?`)) return
    await deleteBanner(banner.id)
    setBanners(bs => bs.filter(b => b.id !== banner.id))
  }

  const active    = banners.filter(b => b.status === 'ACTIVE')
  const scheduled = banners.filter(b => b.status === 'SCHEDULED')
  const expired   = banners.filter(b => b.status === 'EXPIRED')

  if (loading) return <p className="text-gray-500 text-sm">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bannières d'information</h2>
          <p className="text-sm text-gray-500 mt-0.5">Messages diffusés en haut de toutes les pages</p>
        </div>
        <button
          onClick={() => setFormTarget(null)}
          className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Nouvelle bannière
        </button>
      </div>

      {/* Sections */}
      <Section title="Bannières actives" count={active.length}>
        <BannerTable banners={active} onEdit={setFormTarget} onDelete={handleDelete} />
      </Section>

      <Section title="Bannières programmées" count={scheduled.length}>
        <BannerTable banners={scheduled} onEdit={setFormTarget} onDelete={handleDelete} />
      </Section>

      <Section title="Bannières expirées" count={expired.length}>
        <BannerTable banners={expired} onEdit={setFormTarget} onDelete={handleDelete} />
      </Section>

      {/* Formulaire modal */}
      {formTarget !== undefined && (
        <InfoBannerForm
          banner={formTarget}
          onClose={() => setFormTarget(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
