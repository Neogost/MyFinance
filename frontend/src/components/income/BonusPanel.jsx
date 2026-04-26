import { useState, useEffect } from 'react'
import { getBonuses, createBonus, updateBonus, deleteBonus } from '../../api/income'
import BonusForm from './BonusForm'
import { MONTHS_FR_SHORT } from '../../utils/constants.js'

function formatPaymentDate(iso) {
  const [year, month] = iso.split('-')
  return `${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

export default function BonusPanel({ contractId, onBonusChange }) {
  const [bonuses, setBonuses]       = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => { fetchBonuses() }, [contractId])

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
      setBonuses(bs => bs.map(b => b.id === updated.id ? updated : b))
    } else {
      const created = await createBonus(contractId, payload)
      setBonuses(bs => [...bs, created])
    }
    setFormTarget(undefined)
    onBonusChange?.()
  }

  async function handleDelete(bonus) {
    if (!confirm(`Supprimer la prime « ${bonus.label} » ?`)) return
    await deleteBonus(contractId, bonus.id)
    setBonuses(bs => bs.filter(b => b.id !== bonus.id))
    onBonusChange?.()
  }

  const total = bonuses.reduce((s, b) => s + b.grossAmount, 0)

  if (loading) return <p className="text-gray-400 text-sm mt-4">Chargement des primes…</p>
  if (error)   return <p className="text-sm text-red-600 mt-4">{error}</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {bonuses.length} prime{bonuses.length > 1 ? 's' : ''}
          {bonuses.length > 0 && (
            <span className="ml-2 font-semibold text-gray-700">
              — Total brut : <span className="amount">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </span>
          )}
        </p>
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
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Versement</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant brut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {bonuses.map(bonus => (
                <tr key={bonus.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5">
                    {bonus.type === 'ANNUELLE'
                      ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Annuelle</span>
                      : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Exceptionnelle</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{bonus.label}</td>
                  <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                    {bonus.type === 'ANNUELLE'
                      ? `Chaque année en ${MONTHS_FR_SHORT[(bonus.paymentMonth ?? 1) - 1]}`
                      : formatPaymentDate(bonus.paymentDate)
                    }
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-700 amount">
                    {bonus.grossAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
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
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
