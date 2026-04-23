import { useState, useEffect } from 'react'
import { getOnCalls, createOnCall, updateOnCall, deleteOnCall } from '../../api/income'
import OnCallForm from './OnCallForm'

export default function OnCallPanel({ contractId, onOnCallChange }) {
  const [onCalls, setOnCalls]        = useState([])
  const [formTarget, setFormTarget]  = useState(undefined)
  const [loading, setLoading]        = useState(true)
  const [error, setError]            = useState(null)

  useEffect(() => { fetchOnCalls() }, [contractId])

  async function fetchOnCalls() {
    try {
      setLoading(true)
      setOnCalls(await getOnCalls(contractId))
    } catch {
      setError('Impossible de charger les astreintes.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateOnCall(contractId, formTarget.id, payload)
      setOnCalls(ocs => ocs.map(oc => oc.id === updated.id ? updated : oc))
    } else {
      const created = await createOnCall(contractId, payload)
      setOnCalls(ocs => [...ocs, created])
    }
    setFormTarget(undefined)
    onOnCallChange?.()
  }

  async function handleDelete(onCall) {
    if (!confirm('Supprimer cette astreinte ?')) return
    await deleteOnCall(contractId, onCall.id)
    setOnCalls(ocs => ocs.filter(oc => oc.id !== onCall.id))
    onOnCallChange?.()
  }

  const fmt = (n) => n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
  const totalAnnual = onCalls.reduce((s, oc) => s + oc.annualOnCallIncome, 0)

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des astreintes…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {onCalls.length} astreinte{onCalls.length > 1 ? 's' : ''}
          {onCalls.length > 0 && (
            <span className="ml-2 font-semibold text-gray-700">
              — Total annuel estimé : <span className="amount">{fmt(totalAnnual)}</span>
            </span>
          )}
        </p>
        <button
          onClick={() => setFormTarget(null)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter une astreinte
        </button>
      </div>

      {onCalls.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucune astreinte saisie pour ce contrat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Forfait / semaine</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Semaines / an</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total annuel estimé</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {onCalls.map(oc => (
                <tr key={oc.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5 font-semibold text-gray-800 amount">{fmt(oc.weeklyFlatRate)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{oc.estimatedWeeksPerYear} sem.</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">{fmt(oc.annualOnCallIncome)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setFormTarget(oc)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(oc)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
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
        <OnCallForm
          onCall={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
