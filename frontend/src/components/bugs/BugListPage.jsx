import { useState, useEffect } from 'react'
import { getBugReports } from '../../api/bugReports'
import BugDetailModal from './BugDetailModal'
import { useAnalytics } from '../../hooks/useAnalytics'

const STATUSES = [
  { value: '',            label: 'Tous' },
  { value: 'OPEN',        label: 'Ouvert' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'FIXED',       label: 'Corrigé' },
  { value: 'CLOSED',      label: 'Clôturé' },
  { value: 'REJECTED',    label: 'Rejeté' },
  { value: 'DUPLICATE',   label: 'Doublon' },
]

const STATUS_COLOR = {
  OPEN: 'bg-blue-100 text-blue-700 dark:text-blue-300', IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:text-orange-300',
  FIXED: 'bg-green-100 text-green-700 dark:text-green-300', CLOSED: 'bg-gray-100 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700 dark:text-red-300', DUPLICATE: 'bg-gray-100 text-gray-500',
}
const IMPACT_COLOR = {
  LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-yellow-100 text-yellow-700 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:text-orange-300', CRITICAL: 'bg-red-100 text-red-700 dark:text-red-300',
}
const IMPACT_LABEL = { LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Important', CRITICAL: 'Critique' }

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')}`
}

export default function BugListPage({ user, onOpenForm, refetchTrigger = 0 }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('bugs.list') }, [])

  const [bugs,         setBugs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [myBugsOnly,   setMyBugsOnly]   = useState(false)
  const [selectedId,   setSelectedId]   = useState(null)

  function handleScoreChange(id, newScore, newUserVote) {
    setBugs(bs => bs.map(b => b.id === id ? { ...b, score: newScore, userVote: newUserVote } : b))
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    getBugReports(statusFilter ? { status: statusFilter } : {})
      .then(setBugs)
      .catch(() => setError('Impossible de charger les bugs.'))
      .finally(() => setLoading(false))
  }, [statusFilter, refetchTrigger])

  const displayedBugs = myBugsOnly ? bugs.filter(b => b.isReporter) : bugs

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Bugs signalés</h2>
          <p className="text-sm text-gray-500 mt-0.5">Votez et commentez pour aider à prioriser</p>
        </div>
        <button
          onClick={onOpenForm}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 text-[#fff] rounded-lg text-sm font-semibold hover:bg-red-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          Signaler un bug
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === s.value
                ? 'bg-indigo-600 text-[#fff] border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => setMyBugsOnly(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            myBugsOnly
              ? 'bg-indigo-100 text-indigo-700 border-indigo-400 dark:text-indigo-300'
              : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
          }`}
        >
          Mes bugs
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : error ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      ) : displayedBugs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-1">{myBugsOnly ? 'Aucun de vos bugs' : 'Aucun bug signalé'}</p>
          <p className="text-sm">{myBugsOnly ? 'Vous n\'avez pas encore signalé de bug.' : 'Soyez le premier à en signaler un !'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {displayedBugs.map(bug => (
              <button
                key={bug.id}
                onClick={() => setSelectedId(bug.id)}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition flex items-start gap-4"
              >
                {/* Score + indicateur vote courant */}
                <div className="shrink-0 flex flex-col items-center min-w-[40px]">
                  <span className={`text-lg font-bold ${bug.score > 0 ? 'text-green-600' : bug.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {bug.score > 0 ? '+' : ''}{bug.score}
                  </span>
                  {bug.userVote === 'UP'   && <span className="text-xs text-green-500 font-semibold">↑ toi</span>}
                  {bug.userVote === 'DOWN' && <span className="text-xs text-red-400 font-semibold">↓ toi</span>}
                  {!bug.userVote && !bug.isReporter && <span className="text-xs text-gray-400">votes</span>}
                  {bug.isReporter && <span className="text-xs text-indigo-400">auteur</span>}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[bug.status]}`}>
                      {STATUSES.find(s => s.value === bug.status)?.label}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLOR[bug.userImpact]}`}>
                      {IMPACT_LABEL[bug.userImpact]}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate">{bug.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bug.reporterFirstName} · {formatDate(bug.createdAt)} · {bug.commentCount} commentaire{bug.commentCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selectedId && (
        <BugDetailModal
          bugId={selectedId}
          currentUserId={user?.id}
          isReporter={displayedBugs.find(b => b.id === selectedId)?.isReporter ?? false}
          onClose={() => setSelectedId(null)}
          onScoreChange={handleScoreChange}
        />
      )}
    </div>
  )
}
