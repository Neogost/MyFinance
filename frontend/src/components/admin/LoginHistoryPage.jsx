import { useState, useEffect, useCallback } from 'react'
import { getLoginHistory } from '../../api/admin'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function formatDateTime(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

function formatDateTimeCompact(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const TYPE_LABELS = { SUCCESS: 'Succès', FAILURE: 'Échec', BLOCKED: 'Bloqué' }

const TYPE_BADGE = {
  SUCCESS: 'bg-green-100 text-green-800',
  FAILURE: 'bg-orange-100 text-orange-800',
  BLOCKED: 'bg-red-100 text-red-800',
}

const ROW_BG = {
  SUCCESS: 'hover:bg-green-50',
  FAILURE: 'hover:bg-orange-50',
  BLOCKED: 'bg-red-50 hover:bg-red-100',
}

export default function LoginHistoryPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [page,    setPage]    = useState(0)

  const [filters, setFilters] = useState({ login: '', type: '', from: '', to: '' })
  const [applied, setApplied] = useState({ login: '', type: '', from: '', to: '' })

  const fetchHistory = useCallback(async (filters, page) => {
    try {
      setLoading(true)
      setError(null)
      const params = { page, size: 50 }
      if (filters.login) params.login = filters.login
      if (filters.type)  params.type  = filters.type
      if (filters.from)  params.from  = filters.from + ':00'
      if (filters.to)    params.to    = filters.to + ':00'
      setData(await getLoginHistory(params))
    } catch {
      setError('Impossible de charger l\'historique.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory(applied, page) }, [applied, page, fetchHistory])

  function handleSearch(e) {
    e.preventDefault()
    setPage(0)
    setApplied({ ...filters })
  }

  function handleReset() {
    const empty = { login: '', type: '', from: '', to: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Historique des connexions</h2>
        {data && (
          <span className="text-sm text-gray-500">{data.totalElements} événement{data.totalElements !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Filtres ── */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Login</label>
            <input
              type="text"
              value={filters.login}
              onChange={e => setFilters(f => ({ ...f, login: e.target.value }))}
              placeholder="Rechercher…"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Type</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
            >
              <option value="">Tous</option>
              <option value="SUCCESS">Succès</option>
              <option value="FAILURE">Échec</option>
              <option value="BLOCKED">Bloqué</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Du</label>
            <input
              type="datetime-local"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">Au</label>
            <input
              type="datetime-local"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition"
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {/* ── Tableau ── */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Chargement…</p>
      ) : data?.content?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun événement</p>
          <p className="text-sm">Modifiez les filtres pour élargir la recherche.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Adresse IP</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Échecs</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {data?.content?.map(event => (
                <tr key={event.id} className={`border-t border-gray-100 transition ${ROW_BG[event.eventType]}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{event.login}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      <span className="md:hidden">{formatDateTimeCompact(event.timestamp)}</span>
                      <span className="hidden md:inline">{formatDateTime(event.timestamp)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[event.eventType]}`}>
                      {TYPE_LABELS[event.eventType]}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600 font-mono">
                    {event.ipAddress ?? '—'}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-center">
                    {event.failureCount != null
                      ? <span className="font-semibold text-orange-600">{event.failureCount}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500 max-w-xs">
                    <span title={event.userAgent}>
                      {event.userAgent
                        ? event.userAgent.length > 60
                          ? event.userAgent.substring(0, 60) + '…'
                          : event.userAgent
                        : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.totalPages - 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}
