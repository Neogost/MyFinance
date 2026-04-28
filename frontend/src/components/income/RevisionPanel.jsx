import { useState, useEffect } from 'react'
import { getRevisions, createRevision, updateRevision, deleteRevision } from '../../api/income'
import RevisionForm from './RevisionForm'

export default function RevisionPanel({ contractId, contractType, activeRevisionId, onRevisionChange }) {
  const [revisions, setRevisions] = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchRevisions() }, [contractId])

  async function fetchRevisions() {
    try {
      setLoading(true)
      setRevisions(await getRevisions(contractId))
    } catch {
      setError('Impossible de charger les révisions.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateRevision(contractId, formTarget.id, payload)
      setRevisions(rs => rs.map(r => r.id === updated.id ? updated : r))
    } else {
      const created = await createRevision(contractId, payload)
      setRevisions(rs => [created, ...rs])
    }
    setFormTarget(undefined)
    onRevisionChange?.()
  }

  async function handleDelete(revision) {
    if (!confirm(`Supprimer la révision du ${revision.effectiveDate} ?`)) return
    await deleteRevision(contractId, revision.id)
    setRevisions(rs => rs.filter(r => r.id !== revision.id))
    onRevisionChange?.()
  }

  const fmt = v => v?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des révisions…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {revisions.length} révision{revisions.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setFormTarget(null)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter une révision
        </button>
      </div>

      {revisions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucune révision salariale pour ce contrat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date d'effet</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Libellé</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Brut annuel</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {revisions.map(r => (
                <tr key={r.id} className={`border-t border-gray-100 transition ${r.id === activeRevisionId ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2.5 font-medium text-gray-800">
                    {r.effectiveDate}
                    {r.id === activeRevisionId && (
                      <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{r.label ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">{fmt(r.annualGrossSalary)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setFormTarget(r)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(r)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formTarget !== undefined && (
        <RevisionForm
          revision={formTarget}
          contractType={contractType}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
