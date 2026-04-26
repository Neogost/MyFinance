import { useState, useEffect } from 'react'
import { getOtherIncomes, createOtherIncome, updateOtherIncome, deleteOtherIncome } from '../../api/income'
import OtherIncomeForm from './OtherIncomeForm'
import { formatDate } from '../../utils/formatting.js'
import DeleteConfirmModal from '../common/DeleteConfirmModal'

const TYPE_LABELS = {
  LOCATIF:      { label: 'Locatif',       color: 'bg-blue-100 text-blue-700' },
  DIVIDENDE:    { label: 'Dividende',     color: 'bg-violet-100 text-violet-700' },
  AIDE_SOCIALE: { label: 'Aide sociale',  color: 'bg-green-100 text-green-700' },
  AUTRE:        { label: 'Autre',         color: 'bg-gray-100 text-gray-600' },
}

export default function OtherIncomePage() {
  const [incomes, setIncomes]     = useState([])
  const [formTarget, setFormTarget] = useState(undefined)
  const [filter, setFilter]       = useState('ALL')
  const [loading, setLoading]     = useState(true)
  const [error,        setError]        = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { fetchIncomes() }, [])

  async function fetchIncomes() {
    try {
      setLoading(true)
      setIncomes(await getOtherIncomes())
    } catch {
      setError('Impossible de charger les revenus.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateOtherIncome(formTarget.id, payload)
      setIncomes(is => is.map(i => i.id === updated.id ? updated : i))
    } else {
      const created = await createOtherIncome(payload)
      setIncomes(is => [created, ...is])
    }
    setFormTarget(undefined)
  }

  function handleDelete(income) { setDeleteTarget(income) }

  async function confirmDelete() {
    await deleteOtherIncome(deleteTarget.id)
    setIncomes(is => is.filter(i => i.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const filtered = filter === 'ALL' ? incomes : incomes.filter(i => i.type === filter)

  const totalByType = Object.keys(TYPE_LABELS).reduce((acc, type) => {
    acc[type] = incomes.filter(i => i.type === type).reduce((s, i) => s + i.amount, 0)
    return acc
  }, {})
  const totalAll = incomes.reduce((s, i) => s + i.amount, 0)

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Revenus complémentaires</h2>
        <button
          onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* ── Totaux par catégorie ── */}
      {incomes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total</p>
            <p className="text-lg font-bold text-gray-900 amount">
              {totalAll.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </p>
          </div>
          {Object.entries(TYPE_LABELS).map(([type, { label, color }]) => (
            <div key={type} className="bg-white rounded-lg p-4 shadow-sm">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color} block mb-1 w-fit`}>{label}</span>
              <p className="text-base font-bold text-gray-800 amount">
                {totalByType[type].toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtre par type ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['ALL', 'Tous'], ...Object.entries(TYPE_LABELS).map(([v, { label }]) => [v, label])].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === val
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun revenu complémentaire</p>
          <p className="text-sm">Cliquez sur « + Ajouter » pour en saisir un.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fiscalité</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(income => {
                const { label, color } = TYPE_LABELS[income.type] ?? TYPE_LABELS.AUTRE
                return (
                  <tr key={income.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(income.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-[10ch] md:max-w-none truncate">{income.label}</td>
                    <td className="hidden md:table-cell px-4 py-3">
                      {income.isTaxable === false ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Non imposable</span>
                      ) : income.specificTaxRate != null ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Taux fixe {income.specificTaxRate}%</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Barème</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 amount whitespace-nowrap">
                      {income.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col md:flex-row gap-1 md:gap-2 items-end md:justify-end">
                        <button onClick={() => setFormTarget(income)} className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(income)} className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:border-red-500 hover:text-red-600 transition">
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
        <OtherIncomeForm
          income={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title={`Supprimer « ${deleteTarget.label} » ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
