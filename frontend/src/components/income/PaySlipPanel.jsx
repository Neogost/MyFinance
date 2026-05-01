import { useState, useEffect } from 'react'
import { getPaySlips, createPaySlip, updatePaySlip, deletePaySlip, getRevisions } from '../../api/income'
import { useAnalytics } from '../../hooks/useAnalytics'
import PaySlipForm from './PaySlipForm'
import { MONTHS_FR_SHORT } from '../../utils/constants.js'

function formatPeriod(iso) {
  const [year, month] = iso.split('-')
  return `${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

export default function PaySlipPanel({ contractId, projection: contract }) {
  const [slips, setSlips]           = useState([])
  const [revisions, setRevisions]   = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchData() }, [contractId])

  const { trackEvent } = useAnalytics()

  async function fetchData() {
    try {
      setLoading(true)
      const [slipsData, revisionsData] = await Promise.all([
        getPaySlips(contractId),
        getRevisions(contractId),
      ])
      setSlips(slipsData)
      setRevisions(revisionsData)
    } catch {
      setError('Impossible de charger les bulletins.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updatePaySlip(contractId, formTarget.id, payload)
      trackEvent('FEATURE_USE', 'revenus.pay_slip.edit')
      setSlips(ss => ss.map(s => s.id === updated.id ? updated : s))
    } else {
      const created = await createPaySlip(contractId, payload)
      trackEvent('FEATURE_USE', 'revenus.pay_slip.create')
      setSlips(ss => [...ss, created].sort((a, b) => b.period.localeCompare(a.period)))
    }
    setFormTarget(undefined)
  }

  async function handleDelete(slip) {
    if (!confirm(`Supprimer le bulletin de ${formatPeriod(slip.period)} ?`)) return
    await deletePaySlip(contractId, slip.id)
    trackEvent('FEATURE_USE', 'revenus.pay_slip.delete')
    setSlips(ss => ss.filter(s => s.id !== slip.id))
  }

  // Retourne les valeurs théoriques (brut + net mensuel) en vigueur à la période du bulletin.
  // Pour PRIVATE : brut de la révision active à cette date, ou salaire de base du contrat.
  // Pour PUBLIC  : indiceMajore × valeur du point actuelle (approximation, point value stable).
  // Net : ratio net/brut du contrat courant appliqué au brut historique (taux de cotisation fixes).
  function projectionAtPeriod(slip) {
    const slipDate = slip.period // YYYY-MM-DD — la comparaison lexicographique ISO fonctionne

    const activeRevision = revisions
      .filter(r => r.effectiveDate <= slipDate)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]

    let historicalAnnualGross = null
    if (activeRevision) {
      if (activeRevision.annualGrossSalary != null) {
        historicalAnnualGross = activeRevision.annualGrossSalary
      } else if (activeRevision.indiceMajore != null && contract?.pointValueUsed != null) {
        // PUBLIC : approximation avec la valeur du point actuelle
        historicalAnnualGross = activeRevision.indiceMajore * contract.pointValueUsed
      }
    } else {
      // Aucune révision n'était en vigueur : salaire de base du contrat
      historicalAnnualGross = contract?.baseGrossSalary ?? contract?.annualGrossSalary ?? null
    }

    if (historicalAnnualGross == null || !contract?.paidMonthsPerYear) {
      return { gross: contract?.monthlyGrossSalary ?? null, net: contract?.monthlyNetAfterTax ?? null }
    }

    const monthlyGross = historicalAnnualGross / contract.paidMonthsPerYear

    // Net proportionnel : net/brut ratio stable quand les taux de cotisation ne changent pas
    let monthlyNet = null
    if (contract.monthlyNetAfterTax != null && contract.monthlyGrossSalary > 0) {
      monthlyNet = monthlyGross * (contract.monthlyNetAfterTax / contract.monthlyGrossSalary)
    }

    return { gross: monthlyGross, net: monthlyNet }
  }

  function diff(real, theoretical) {
    if (real == null || theoretical == null) return null
    return real - theoretical
  }

  const DiffBadge = ({ value }) => {
    if (value == null) return null
    const positive = value >= 0
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${
        positive
          ? 'bg-green-100 text-green-700 dark:text-green-300'
          : 'bg-red-100 text-red-700 dark:text-red-300'
      }`}>
        <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
        {positive ? '+' : ''}{value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </span>
    )
  }

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des bulletins…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {slips.length} bulletin{slips.length > 1 ? 's' : ''} enregistré{slips.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setFormTarget(null)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter un bulletin
        </button>
      </div>

      {slips.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucun bulletin saisi pour ce contrat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Période</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Brut réel</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">vs théorique</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Net versé</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">vs théorique</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">PAS</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {slips.map(slip => {
                const proj = projectionAtPeriod(slip)
                return (
                  <tr key={slip.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{formatPeriod(slip.period)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 amount">
                      {slip.grossSalary?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell amount">
                      <DiffBadge value={diff(slip.grossSalary, proj.gross)} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">
                      {slip.netSalary?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell amount">
                      <DiffBadge value={diff(slip.netSalary, proj.net)} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500 hidden md:table-cell amount">
                      {slip.incomeTaxWithholding?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setFormTarget(slip)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                          Modifier
                        </button>
                        <button onClick={() => setFormTarget({ ...slip, id: undefined, period: '' })}
                          title="Dupliquer ce bulletin (la période sera à choisir)"
                          className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                          Dupliquer
                        </button>
                        <button onClick={() => handleDelete(slip)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formTarget !== undefined && (
        <PaySlipForm
          slip={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
