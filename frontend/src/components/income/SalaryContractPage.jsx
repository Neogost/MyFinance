import { useState, useEffect } from 'react'
import {
  getSalaryContracts, createSalaryContract,
  updateSalaryContract, deleteSalaryContract,
} from '../../api/income'
import SalaryContractForm from './SalaryContractForm'
import ProjectionGrid from './ProjectionGrid'
import PaySlipPanel from './PaySlipPanel'

export default function SalaryContractPage() {
  const [contracts, setContracts] = useState([])
  const [selected, setSelected]   = useState(null)   // contrat affiché en détail
  const [formTarget, setFormTarget] = useState(undefined)  // undefined = fermé, null = création, obj = édition
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showSlips, setShowSlips] = useState(false)

  useEffect(() => { fetchContracts() }, [])

  async function fetchContracts() {
    try {
      setLoading(true)
      const data = await getSalaryContracts()
      setContracts(data)
      // Sélectionne automatiquement le contrat actif
      const active = data.find(c => !c.endDate) ?? data[0] ?? null
      setSelected(active)
    } catch {
      setError('Impossible de charger les contrats.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateSalaryContract(formTarget.id, payload)
      setContracts(cs => cs.map(c => c.id === updated.id ? updated : c))
      setSelected(updated)
    } else {
      const created = await createSalaryContract(payload)
      setContracts(cs => [...cs, created])
      setSelected(created)
    }
    setFormTarget(undefined)
  }

  async function handleDelete(contract) {
    if (!confirm(`Supprimer le contrat débutant le ${contract.startDate} ? Les bulletins associés seront aussi supprimés.`)) return
    await deleteSalaryContract(contract.id)
    const remaining = contracts.filter(c => c.id !== contract.id)
    setContracts(remaining)
    setSelected(remaining[0] ?? null)
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Revenus salariaux</h2>
        <button
          onClick={() => setFormTarget(null)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
        >
          + Nouveau contrat
        </button>
      </div>

      {/* ── Onglets de contrats ── */}
      {contracts.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {contracts.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelected(c); setShowSlips(false) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selected?.id === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
              }`}
            >
              {c.startDate} {!c.endDate ? '(actif)' : `→ ${c.endDate}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Détail du contrat sélectionné ── */}
      {selected ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Infos contractuelles */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-gray-900">
                  Contrat depuis le {selected.startDate}
                </h3>
                {!selected.endDate
                  ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Actif</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Clôturé le {selected.endDate}</span>
                }
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Brut annuel : <strong className="text-gray-900">{selected.annualGrossSalary?.toLocaleString('fr-FR')} €</strong></span>
                <span>{selected.paidMonthsPerYear} mois / an</span>
                <span>{selected.weeklyHours} h / semaine</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFormTarget(selected)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(selected)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-red-500 hover:text-red-600 transition"
              >
                Supprimer
              </button>
            </div>
          </div>

          {/* Projections */}
          <ProjectionGrid contract={selected} />

          {/* Séparateur + bouton bulletins */}
          <div className="border-t border-gray-100 mt-6 pt-4">
            <button
              onClick={() => setShowSlips(v => !v)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              {showSlips ? '▲ Masquer les bulletins de paie' : '▼ Afficher les bulletins de paie'}
            </button>
            {showSlips && (
              <PaySlipPanel contractId={selected.id} projection={selected} />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg mb-2">Aucun contrat salarial</p>
          <p className="text-sm">Cliquez sur « + Nouveau contrat » pour commencer.</p>
        </div>
      )}

      {/* ── Modal formulaire ── */}
      {formTarget !== undefined && (
        <SalaryContractForm
          contract={formTarget}
          onSubmit={handleSubmit}
          onCancel={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
