import { useState, useEffect } from 'react'
import { getAdminBugReports, getAdminBugReport, patchBugReport, deleteAdminBugReport, commentBugReport, getBugLogs } from '../../api/bugReports'
import { useAnalytics } from '../../hooks/useAnalytics'

const STATUSES  = ['OPEN', 'IN_PROGRESS', 'FIXED', 'CLOSED', 'REJECTED', 'DUPLICATE']
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUS_LABEL  = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', FIXED: 'Corrigé', CLOSED: 'Clôturé', REJECTED: 'Rejeté', DUPLICATE: 'Doublon' }
const SEVERITY_LABEL = { LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Important', CRITICAL: 'Critique' }
const STATUS_COLOR = { OPEN: 'bg-blue-100 text-blue-700 dark:text-blue-300', IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:text-orange-300', FIXED: 'bg-green-100 text-green-700 dark:text-green-300', CLOSED: 'bg-gray-100 text-gray-600', REJECTED: 'bg-red-100 text-red-700 dark:text-red-300', DUPLICATE: 'bg-gray-100 text-gray-500' }
const IMPACT_COLOR = { LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-yellow-100 text-yellow-700 dark:text-yellow-300', HIGH: 'bg-orange-100 text-orange-700 dark:text-orange-300', CRITICAL: 'bg-red-100 text-red-700 dark:text-red-300' }

function formatDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function DetailPanel({ bug, detailLoading, onClose, onUpdated, onNavigate }) {
  const [status,     setStatus]   = useState(bug.status)
  const [priority,   setPriority] = useState(bug.priority ?? '')
  const [comment,    setComment]  = useState('')
  const [saving,     setSaving]   = useState(false)
  const [posting,    setPosting]  = useState(false)
  const [logs,       setLogs]     = useState(null)   // null = pas encore demandé
  const [logsLoading,setLogsLoading] = useState(false)

  async function handleExtractLogs() {
    setLogsLoading(true)
    try {
      setLogs(await getBugLogs(bug.id, 1))
    } finally {
      setLogsLoading(false)
    }
  }

  async function handlePatch() {
    if (status === bug.status && (priority || null) === bug.priority) return
    setSaving(true)
    try {
      const updated = await patchBugReport(bug.id, {
        status: status !== bug.status ? status : null,
        priority: priority && priority !== bug.priority ? priority : null,
      })
      onUpdated(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const c = await commentBugReport(bug.id, comment.trim())
      onUpdated({ ...bug, comments: [...(bug.comments ?? []), c] })
      setComment('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-gray-900">{bug.title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Infos reporter */}
      <div className="text-xs text-gray-400 space-y-0.5">
        <div>Reporter : <span className="font-medium text-gray-600">{bug.reporterLogin}</span></div>
        {bug.sessionId && (
          <div className="flex items-center gap-2">
            <span>Session : <code className="bg-gray-100 px-1 rounded text-gray-600">{bug.sessionId}</code></span>
            <button
              onClick={() => {
                sessionStorage.setItem('analytics-jump-session', bug.sessionId)
                onNavigate('admin-analytics')
              }}
              title="Voir le parcours de cette session dans Analytics"
              className="text-indigo-500 hover:text-indigo-700 transition text-xs font-medium whitespace-nowrap"
            >
              Voir le parcours →
            </button>
          </div>
        )}
        <div>Signalé le : {formatDt(bug.createdAt)}</div>
        {bug.approximateDateTime && <div>Survenu vers : {formatDt(bug.approximateDateTime)}</div>}
      </div>

      {/* Contenu — affiché immédiatement, placeholder pendant le fetch du détail */}
      {detailLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-1/3"/>
          <div className="h-3 bg-gray-200 rounded w-full"/>
          <div className="h-3 bg-gray-200 rounded w-5/6"/>
          <div className="h-3 bg-gray-200 rounded w-full"/>
        </div>
      ) : (
        <>
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.description}</p>
          </section>
          {bug.expectedResult && (
            <section>
              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Résultat souhaité</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.expectedResult}</p>
            </section>
          )}
          {bug.reproductionSteps && (
            <section>
              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Reproduction</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{bug.reproductionSteps}</p>
            </section>
          )}
        </>
      )}

      {/* Triage admin */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Triage admin</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priorité</label>
            <select value={priority} onChange={e => setPriority(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Non définie</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handlePatch} disabled={saving}
          className="w-full py-2 bg-indigo-600 text-[#fff] rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer le triage'}
        </button>
      </div>

      {/* Commentaires */}
      <section>
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Commentaires ({(bug.comments ?? []).length})
        </p>
        <div className="space-y-2 mb-3">
          {(bug.comments ?? []).map(c => (
            <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-xs font-semibold text-gray-700">{c.authorDisplay}</span>
                <span className="text-xs text-gray-400">{formatDt(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600">{c.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleComment} className="flex gap-2">
          <input type="text" maxLength={2000} value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Commentaire admin…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!comment.trim() || posting}
            className="px-3 py-2 bg-indigo-600 text-[#fff] rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {posting ? '…' : 'Envoyer'}
          </button>
        </form>
      </section>

      {/* Extraction des logs */}
      {bug.approximateDateTime && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Logs serveur (±1 min)
            </p>
            {!logs && (
              <button
                onClick={handleExtractLogs}
                disabled={logsLoading}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition disabled:opacity-50"
              >
                {logsLoading ? 'Extraction…' : 'Extraire les logs →'}
              </button>
            )}
            {logs && (
              <button
                onClick={() => setLogs(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Masquer
              </button>
            )}
          </div>

          {logs && !logs.available && (
            <p className="text-xs text-gray-400 italic">
              Logs non disponibles dans ce profil (console uniquement en dev).
            </p>
          )}

          {logs && logs.available && (
            <>
              <p className="text-xs text-gray-400 mb-2">
                {logs.fileName} · {logs.lineCount} ligne{logs.lineCount !== 1 ? 's' : ''} trouvée{logs.lineCount !== 1 ? 's' : ''}
              </p>
              {logs.lineCount === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucune ligne dans cette fenêtre temporelle.</p>
              ) : (
                <pre className="bg-gray-950 text-gray-100 text-xs rounded-lg p-3 overflow-x-auto overflow-y-auto max-h-72 leading-5 whitespace-pre-wrap break-all">
                  {logs.lines.join('\n')}
                </pre>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default function AdminBugReportPage({ onNavigate }) {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('admin.bug_reports') }, [])

  const [bugs,          setBugs]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [priorityFilter,setPriorityFilter]= useState('')
  const [selected,      setSelected]      = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setSelected(null) // ferme le panneau si le bug sélectionné disparaît des résultats filtrés
    setLoading(true)
    const params = {}
    if (statusFilter)  params.status   = statusFilter
    if (priorityFilter) params.priority = priorityFilter
    getAdminBugReports(params)
      .then(setBugs)
      .catch(() => setError('Impossible de charger les bugs.'))
      .finally(() => setLoading(false))
  }, [statusFilter, priorityFilter])

  // Affiche le panneau immédiatement avec les données du résumé,
  // puis enrichit silencieusement avec le détail complet (description, étapes…)
  async function handleSelectBug(summaryBug) {
    if (selected?.id === summaryBug.id) { setSelected(null); return }
    setSelected(summaryBug)
    setDetailLoading(true)
    try {
      const full = await getAdminBugReport(summaryBug.id)
      setSelected(prev => prev?.id === summaryBug.id ? { ...prev, ...full } : prev)
    } finally {
      setDetailLoading(false)
    }
  }

  function handleUpdated(updated) {
    setBugs(bs => bs.map(b => b.id === updated.id ? { ...b, ...updated } : b))
    setSelected(prev => prev ? { ...prev, ...updated } : null)
  }

  async function handleDelete(bug) {
    if (!confirm(`Supprimer le bug « ${bug.title} » ?`)) return
    await deleteAdminBugReport(bug.id)
    setBugs(bs => bs.filter(b => b.id !== bug.id))
    if (selected?.id === bug.id) setSelected(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Signalements de bugs</h2>
          <p className="text-sm text-gray-500 mt-0.5">Triage, priorisation et suivi des bugs remontés</p>
        </div>
      </div>

      {/* Filtres — statuts */}
      <div className="flex flex-wrap gap-2">
        {[{ value: '', label: 'Tous' }, ...STATUSES.map(s => ({ value: s, label: STATUS_LABEL[s] }))].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === value
                ? 'bg-indigo-600 text-[#fff] border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres — priorités */}
      <div className="flex flex-wrap gap-2">
        {[{ value: '', label: 'Toutes priorités' }, ...SEVERITIES.map(s => ({ value: s, label: SEVERITY_LABEL[s] }))].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPriorityFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              priorityFilter === value
                ? 'bg-indigo-600 text-[#fff] border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* Liste */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : error ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {bugs.length === 0 ? (
                <p className="p-8 text-center text-gray-400 text-sm italic">Aucun bug correspondant.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-2 pr-3 pl-5">Score</th>
                        <th className="pb-2 pr-3">Titre</th>
                        <th className="pb-2 pr-3">Impact</th>
                        <th className="pb-2 pr-3">Statut</th>
                        {!selected && <th className="pb-2 pr-3">Priorité</th>}
                        {!selected && <th className="pb-2 pr-3">Reporter</th>}
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bugs.map(bug => (
                        <tr key={bug.id}
                          className={`hover:bg-gray-50 transition cursor-pointer ${selected?.id === bug.id ? 'bg-indigo-50' : ''}`}
                          onClick={() => handleSelectBug(bug)}>
                          <td className="py-3 pr-3 pl-5">
                            <span className={`font-bold ${bug.score > 0 ? 'text-green-600' : bug.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {bug.score > 0 ? '+' : ''}{bug.score}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">{bug.title}</p>
                            <p className="text-xs text-gray-400">{bug.commentCount} commentaire{bug.commentCount !== 1 ? 's' : ''}</p>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLOR[bug.userImpact]}`}>
                              {SEVERITY_LABEL[bug.userImpact]}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[bug.status]}`}>
                              {STATUS_LABEL[bug.status]}
                            </span>
                          </td>
                          {!selected && (
                            <td className="py-3 pr-3 text-gray-600">
                              {bug.priority ? SEVERITY_LABEL[bug.priority] : <span className="text-gray-300">—</span>}
                            </td>
                          )}
                          {!selected && (
                            <td className="py-3 pr-3 text-gray-600">{bug.reporterLogin}</td>
                          )}
                          <td className="py-3 pr-2">
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(bug) }}
                              className="text-xs text-red-500 hover:underline font-medium"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panneau détail — prend la moitié de la page quand ouvert */}
        {selected && (
          <div className="w-full lg:w-1/2 shrink-0">
            <DetailPanel
              bug={selected}
              detailLoading={detailLoading}
              onClose={() => setSelected(null)}
              onUpdated={handleUpdated}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </div>
  )
}
