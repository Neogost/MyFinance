import { useState, useEffect } from 'react'
import { getBenefits, createBenefit, updateBenefit, deleteBenefit } from '../../api/income'
import { useAnalytics } from '../../hooks/useAnalytics'
import BenefitForm from './BenefitForm'

export default function BenefitPanel({ contractId, onBenefitChange }) {
  const [benefits, setBenefits]     = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchBenefits() }, [contractId])

  const { trackEvent } = useAnalytics()

  async function fetchBenefits() {
    try {
      setLoading(true)
      setBenefits(await getBenefits(contractId))
    } catch {
      setError('Impossible de charger les avantages.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateBenefit(contractId, formTarget.id, payload)
      trackEvent('FEATURE_USE', 'revenus.benefit.edit')
      setBenefits(bs => bs.map(b => b.id === updated.id ? updated : b))
    } else {
      const created = await createBenefit(contractId, payload)
      trackEvent('FEATURE_USE', 'revenus.benefit.create')
      setBenefits(bs => [...bs, created])
    }
    setFormTarget(undefined)
    onBenefitChange?.()
  }

  async function handleDelete(benefit) {
    if (!confirm(`Supprimer l'avantage « ${benefit.label} » ?`)) return
    await deleteBenefit(contractId, benefit.id)
    trackEvent('FEATURE_USE', 'revenus.benefit.delete')
    setBenefits(bs => bs.filter(b => b.id !== benefit.id))
    onBenefitChange?.()
  }

  const total = benefits.reduce((s, b) => s + b.monthlyAmount, 0)

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des avantages…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {benefits.length} avantage{benefits.length > 1 ? 's' : ''}
          {benefits.length > 0 && (
            <span className="ml-2 font-semibold text-gray-700">
              — Total mensuel : <span className="amount">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </span>
          )}
        </p>
        <button
          onClick={() => setFormTarget(null)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter un avantage
        </button>
      </div>

      {benefits.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucun avantage en nature saisi pour ce contrat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type d'avantage</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant mensuel</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {benefits.map(benefit => (
                <tr key={benefit.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5 font-medium text-gray-800">{benefit.label}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">
                    {benefit.monthlyAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setFormTarget(benefit)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(benefit)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
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
        <BenefitForm
          benefit={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
