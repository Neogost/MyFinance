import { useState, useEffect } from 'react'
import { getBonuses, createBonus, updateBonus, deleteBonus } from '../../api/income'
import { useAnalytics } from '../../hooks/useAnalytics'
import BonusForm from './BonusForm'
import { MONTHS_FR_SHORT } from '../../utils/constants.js'

function formatPaymentDate(iso) {
  const [year, month] = iso.split('-')
  return `${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

function formatPeriod(iso) {
  if (!iso) return null
  const [year, month] = iso.split('-')
  return `${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

function MensuellePeriod({ bonus }) {
  const start = formatPeriod(bonus.startDate)
  const end   = formatPeriod(bonus.endDate)
  const today = new Date().toISOString().slice(0, 10)
  const active = bonus.startDate <= today && (!bonus.endDate || bonus.endDate >= today)
  return (
    <span className="flex items-center gap-1.5">
      {active
        ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Active" />
        : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="Terminée" />
      }
      {end ? `${start} → ${end}` : `Depuis ${start}`}
    </span>
  )
}

export default function BonusPanel({ contractId, contractType, onBonusChange }) {
  const [bonuses, setBonuses]       = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchBonuses() }, [contractId])

  const { trackEvent } = useAnalytics()

  async function fetchBonuses() {
    try {
      setLoading(true)
      setBonuses(await getBonuses(contractId))
    } catch {
      setError('Impossible de charger les primes.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateBonus(contractId, formTarget.id, payload)
      trackEvent('FEATURE_USE', 'revenus.bonus.edit')
      setBonuses(bs => bs.map(b => b.id === updated.id ? updated : b))
    } else {
      const created = await createBonus(contractId, payload)
      trackEvent('FEATURE_USE', 'revenus.bonus.create')
      setBonuses(bs => [...bs, created])
    }
    setFormTarget(undefined)
    onBonusChange?.()
  }

  async function handleDelete(bonus) {
    if (!confirm(`Supprimer la prime « ${bonus.label} » ?`)) return
    await deleteBonus(contractId, bonus.id)
    trackEvent('FEATURE_USE', 'revenus.bonus.delete')
    setBonuses(bs => bs.filter(b => b.id !== bonus.id))
    onBonusChange?.()
  }

  const annuellesTotal   = bonuses.filter(b => b.type === 'ANNUELLE').reduce((s, b) => s + b.grossAmount, 0)
  const mensuellesTotaux = bonuses.filter(b => b.type === 'MENSUELLE').reduce((s, b) => s + b.grossAmount, 0)

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des primes…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
          <span>{bonuses.length} prime{bonuses.length > 1 ? 's' : ''}</span>
          {annuellesTotal > 0 && (
            <span className="font-semibold text-gray-700">
              Annuelles : <span className="amount">{annuellesTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €/an</span>
            </span>
          )}
          {mensuellesTotaux > 0 && (
            <span className="font-semibold text-gray-700">
              Mensuelles : <span className="amount">{mensuellesTotaux.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €/mois</span>
            </span>
          )}
        </div>
        <button
          onClick={() => setFormTarget(null)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter une prime
        </button>
      </div>

      {bonuses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Aucune prime saisie pour ce contrat.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Période / Versement</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant brut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map(bonus => (
                <tr key={bonus.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5">
                    {bonus.type === 'ANNUELLE'
                      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:text-blue-300">Annuelle</span>
                      : bonus.type === 'MENSUELLE'
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:text-violet-300">Mensuelle</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:text-amber-300">Exceptionnelle</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{bonus.label}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {bonus.type === 'ANNUELLE'
                      ? `Chaque année en ${MONTHS_FR_SHORT[(bonus.paymentMonth ?? 1) - 1]}`
                      : bonus.type === 'MENSUELLE'
                        ? <MensuellePeriod bonus={bonus} />
                        : formatPaymentDate(bonus.paymentDate)
                    }
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">
                    {bonus.grossAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    {bonus.type === 'MENSUELLE' && <span className="text-xs font-normal text-gray-400 ml-1">/mois</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setFormTarget(bonus)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                        Modifier
                      </button>
                      <button onClick={() => handleDelete(bonus)} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
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
        <BonusForm
          bonus={formTarget}
          contractType={contractType}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
