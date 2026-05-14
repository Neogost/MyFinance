import { useState, useEffect } from 'react'
import { getBugReport, voteBugReport, removeVoteBugReport, commentBugReport } from '../../api/bugReports'

const STATUS_LABEL = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', FIXED: 'Corrigé', CLOSED: 'Clôturé', REJECTED: 'Rejeté', DUPLICATE: 'Doublon' }
const STATUS_COLOR = { OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-orange-100 text-orange-700', FIXED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-600', REJECTED: 'bg-red-100 text-red-700', DUPLICATE: 'bg-gray-100 text-gray-500' }
const IMPACT_COLOR = { LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' }
const IMPACT_LABEL = { LOW: 'Faible', MEDIUM: 'Modéré', HIGH: 'Important', CRITICAL: 'Critique' }

function formatDt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function BugDetailModal({ bugId, currentUserId, isReporter, onClose, onScoreChange }) {
  const [bug,     setBug]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    getBugReport(bugId).then(setBug).finally(() => setLoading(false))
  }, [bugId])

  async function handleVote(voteType) {
    if (!bug) return
    let res
    if (bug.userVote === voteType) {
      res = await removeVoteBugReport(bugId)
      setBug(b => ({ ...b, score: res.score, userVote: null }))
    } else {
      res = await voteBugReport(bugId, voteType)
      setBug(b => ({ ...b, score: res.score, userVote: voteType }))
    }
    onScoreChange?.(bugId, res.score, bug.userVote === voteType ? null : voteType)
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const newComment = await commentBugReport(bugId, comment.trim())
      setBug(b => ({ ...b, comments: [...(b.comments ?? []), newComment], commentCount: (b.commentCount ?? 0) + 1 }))
      setComment('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full sm:max-w-2xl sm:mx-4 rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">
            {loading ? 'Chargement…' : bug?.title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading || !bug ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Badges + score */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[bug.status]}`}>
                {STATUS_LABEL[bug.status]}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${IMPACT_COLOR[bug.userImpact]}`}>
                Impact : {IMPACT_LABEL[bug.userImpact]}
              </span>
              {bug.priority && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Priorité : {IMPACT_LABEL[bug.priority]}
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">Signalé par {bug.reporterFirstName} — {formatDt(bug.createdAt)}</span>
            </div>

            {/* Description */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{bug.description}</p>
            </section>

            {bug.expectedResult && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Résultat souhaité</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{bug.expectedResult}</p>
              </section>
            )}

            {bug.reproductionSteps && (
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Étapes pour reproduire</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap font-mono">{bug.reproductionSteps}</p>
              </section>
            )}

            {bug.approximateDateTime && (
              <p className="text-xs text-gray-400">Survenu vers : {formatDt(bug.approximateDateTime)}</p>
            )}

            {/* Votes */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Score : {bug.score > 0 ? '+' : ''}{bug.score}</span>
              {!isReporter && (
                <>
                  <button
                    onClick={() => handleVote('UP')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      bug.userVote === 'UP' ? 'bg-green-100 border-green-400 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600'
                    }`}
                  >
                    ↑ Je confirme
                  </button>
                  <button
                    onClick={() => handleVote('DOWN')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      bug.userVote === 'DOWN' ? 'bg-red-100 border-red-400 text-red-700' : 'border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-600'
                    }`}
                  >
                    ↓ Pas ce bug
                  </button>
                </>
              )}
              {isReporter && (
                <span className="text-xs text-gray-400 italic">Vous avez signalé ce bug</span>
              )}
            </div>

            {/* Commentaires */}
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Commentaires ({bug.commentCount ?? bug.comments?.length ?? 0})
              </h3>
              <div className="space-y-3">
                {(bug.comments ?? []).map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.authorDisplay}</span>
                      <span className="text-xs text-gray-400">{formatDt(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>

              {/* Champ commentaire */}
              <form onSubmit={handleComment} className="mt-4 flex gap-2">
                <input
                  type="text"
                  maxLength={2000}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" disabled={!comment.trim() || posting}
                  className="px-4 py-2 bg-indigo-600 text-[#fff] rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                  {posting ? '…' : 'Envoyer'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
