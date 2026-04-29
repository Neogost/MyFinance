import { useState, useEffect } from 'react'
import { getSnapshots, createSnapshot, createSnapshotForAll, recalculateSnapshot } from '../../api/patrimoine'

function fmt(value) {
  if (value == null) return '—'
  return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

function fmtDate(isoDate) {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SnapshotPanel({ onClose }) {
  const [snapshots, setSnapshots]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [creatingAll, setCreatingAll] = useState(false)
  const [recalcId, setRecalcId]     = useState(null)
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError]           = useState(null)
  const [success, setSuccess]       = useState(null)

  useEffect(() => { fetchSnapshots() }, [])

  async function fetchSnapshots() {
    try {
      setLoading(true)
      setSnapshots(await getSnapshots())
    } catch {
      setError('Impossible de charger les relevés.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setCreating(true)
    setError(null)
    setSuccess(null)
    try {
      await createSnapshot({ snapshotDate })
      setSuccess(`Relevé du ${fmtDate(snapshotDate)} généré avec succès.`)
      await fetchSnapshots()
    } catch (e) {
      const msg = e?.response?.data?.message
      setError(msg ?? 'Erreur lors de la génération du relevé.')
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateAll() {
    setCreatingAll(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await createSnapshotForAll({ snapshotDate })
      const parts = [`${result.created} créé(s)`]
      if (result.skipped > 0) parts.push(`${result.skipped} ignoré(s) (déjà existant)`)
      if (result.failed  > 0) parts.push(`${result.failed} échoué(s)`)
      setSuccess(`Relevés générés — ${parts.join(', ')}.`)
      await fetchSnapshots()
    } catch {
      setError('Erreur lors de la génération groupée des relevés.')
    } finally {
      setCreatingAll(false)
    }
  }

  async function handleRecalculate(id) {
    setRecalcId(id)
    setError(null)
    setSuccess(null)
    try {
      await recalculateSnapshot(id)
      setSuccess('Relevé recalculé avec succès.')
      await fetchSnapshots()
    } catch {
      setError('Erreur lors du recalcul.')
    } finally {
      setRecalcId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Relevés de patrimoine</h3>
          <p className="text-sm text-gray-500 mt-1">
            Générez un relevé de votre patrimoine à une date donnée pour suivre son évolution dans le temps.
          </p>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-5">

          {/* Génération */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-indigo-700">Date du relevé</label>
              <input
                type="date"
                value={snapshotDate}
                onChange={e => setSnapshotDate(e.target.value)}
                className="px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || creatingAll || !snapshotDate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
              {creating ? 'Génération…' : 'Mon relevé'}
            </button>
            <button
              onClick={handleCreateAll}
              disabled={creating || creatingAll || !snapshotDate}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition">
              {creatingAll ? 'Génération…' : 'Tous les utilisateurs'}
            </button>
          </div>

          {/* Feedbacks */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>
          )}

          {/* Historique */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Historique</p>

            {loading && (
              <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
            )}

            {!loading && snapshots.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Aucun relevé existant.</p>
            )}

            {!loading && snapshots.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-3 font-medium">Date</th>
                    <th className="text-right pb-3 font-medium">Investi</th>
                    <th className="text-right pb-3 font-medium">Valeur</th>
                    <th className="text-right pb-3 font-medium">Plus-value</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {snapshots.map(s => {
                    const gain = parseFloat(s.totalCapitalGainEur ?? 0)
                    return (
                      <tr key={s.id} className="group">
                        <td className="py-3 font-medium text-gray-900">{fmtDate(s.snapshotDate)}</td>
                        <td className="py-3 text-right text-gray-700 amount">{fmt(s.totalInvestedEur)}</td>
                        <td className="py-3 text-right font-semibold text-gray-900 amount">{fmt(s.totalCurrentValueEur)}</td>
                        <td className={`py-3 text-right font-semibold amount ${gain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(s.totalCapitalGainEur)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleRecalculate(s.id)}
                            disabled={recalcId === s.id}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition disabled:opacity-50">
                            {recalcId === s.id ? '…' : 'Recalculer'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
