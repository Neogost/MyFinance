import { useState, useEffect } from 'react'
import { getRegistrations, approveRegistration, rejectRegistration } from '../../api/registrations'
import { MONTHS_FR_SHORT } from '../../utils/constants.js'
import { useAnalytics } from '../../hooks/useAnalytics'

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_FR_SHORT[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const STATUS_LABELS = { PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Rejeté' }
const STATUS_CLS    = {
  PENDING:  'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
}

export default function RegistrationRequestPage({ onPendingCountChange }) {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('admin.registration') }, [])
  const [requests, setRequests]   = useState([])
  const [filter, setFilter]       = useState('PENDING')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => { fetchRequests() }, [filter])

  async function fetchRequests() {
    setLoading(true)
    setError(null)
    try {
      const data = await getRegistrations(filter || null)
      setRequests(data)
      if (onPendingCountChange) {
        const pendingCount = filter === 'PENDING' ? data.length
          : (await getRegistrations('PENDING')).length
        onPendingCountChange(pendingCount)
      }
    } catch {
      setError('Impossible de charger les demandes.')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id) {
    setActionError(null)
    try {
      const updated = await approveRegistration(id)
      trackEvent('FEATURE_USE', 'admin.registration.approve')
      setRequests(rs => rs.map(r => r.id === id ? updated : r))
      if (onPendingCountChange) {
        const count = await getRegistrations('PENDING')
        onPendingCountChange(count.length)
      }
    } catch (err) {
      setActionError(err.response?.status === 409
        ? 'Cette demande a déjà été traitée.'
        : 'Erreur lors de l\'approbation.')
    }
  }

  async function handleReject(id) {
    if (!confirm('Rejeter cette demande ?')) return
    setActionError(null)
    try {
      const updated = await rejectRegistration(id)
      trackEvent('FEATURE_USE', 'admin.registration.reject')
      setRequests(rs => rs.map(r => r.id === id ? updated : r))
      if (onPendingCountChange) {
        const count = await getRegistrations('PENDING')
        onPendingCountChange(count.length)
      }
    } catch (err) {
      setActionError(err.response?.status === 409
        ? 'Cette demande a déjà été traitée.'
        : 'Erreur lors du rejet.')
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Demandes d'inscription</h2>
        <div className="flex flex-wrap gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', ''].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                filter === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {s === '' ? 'Toutes' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{actionError}</p>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Chargement…</p>
      ) : error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-1">Aucune demande</p>
          <p className="text-sm">
            {filter === 'PENDING' ? 'Aucune demande en attente de validation.' : 'Aucune demande dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Login</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prénom</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Soumis le</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Traité par</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono text-gray-800">{r.login}</p>
                    <p className="md:hidden text-xs text-gray-400 mt-0.5">{r.firstName} {r.lastName}</p>
                    <p className="md:hidden text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-800">{r.lastName}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-800">{r.firstName}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">
                    {r.reviewedBy ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <div className="flex flex-col md:flex-row items-end md:justify-end gap-1 md:gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-green-500 hover:text-green-700 transition"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition"
                        >
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
