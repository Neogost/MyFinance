import { useState, useEffect } from 'react'
import {
  getSalaryContracts, createSalaryContract,
  updateSalaryContract, deleteSalaryContract, getBonuses, getBenefits, getOnCalls,
} from '../../api/income'
import SalaryContractForm from './SalaryContractForm'
import ProjectionGrid from './ProjectionGrid'
import PaySlipPanel from './PaySlipPanel'
import BonusPanel from './BonusPanel'
import BenefitPanel from './BenefitPanel'
import RevisionPanel from './RevisionPanel'
import OnCallPanel from './OnCallPanel'

export default function SalaryContractPage() {
  const [contracts, setContracts] = useState([])
  const [selected, setSelected]   = useState(null)   // contrat affiché en détail
  const [formTarget, setFormTarget] = useState(undefined)  // undefined = fermé, null = création, obj = édition
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showSlips, setShowSlips] = useState(false)
  const [showBonuses, setShowBonuses] = useState(false)
  const [showBenefits, setShowBenefits] = useState(false)
  const [showRevisions, setShowRevisions] = useState(false)
  const [showOnCalls, setShowOnCalls] = useState(false)
  const [annualBonuses, setAnnualBonuses] = useState([])
  const [benefits, setBenefits] = useState([])
  const [onCalls, setOnCalls] = useState([])

  useEffect(() => { fetchContracts() }, [])

  function fetchAnnualBonuses(contractId) {
    if (!contractId) { setAnnualBonuses([]); return }
    getBonuses(contractId)
      .then(bs => setAnnualBonuses(bs.filter(b => b.type === 'ANNUELLE')))
      .catch(() => setAnnualBonuses([]))
  }

  function fetchBenefits(contractId) {
    if (!contractId) { setBenefits([]); return }
    getBenefits(contractId)
      .then(bs => setBenefits(bs))
      .catch(() => setBenefits([]))
  }

  function fetchOnCalls(contractId) {
    if (!contractId) { setOnCalls([]); return }
    getOnCalls(contractId)
      .then(ocs => setOnCalls(ocs))
      .catch(() => setOnCalls([]))
  }

  useEffect(() => {
    fetchAnnualBonuses(selected?.id)
    fetchBenefits(selected?.id)
    fetchOnCalls(selected?.id)
  }, [selected?.id])

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
              onClick={() => { setSelected(c); setShowSlips(false); setShowBonuses(false); setShowBenefits(false); setShowRevisions(false); setShowOnCalls(false) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                selected?.id === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'
              }`}
            >
              {c.companyName ? <><strong className='amount'>{c.companyName}</strong> — </> : ''}{c.startDate} {!c.endDate ? '(actif)' : `→ ${c.endDate}`}
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
                  <span className='amount'>{selected.companyName ? `${selected.companyName} — ` : ''}</span>Contrat depuis le {selected.startDate}
                </h3>
                {!selected.endDate
                  ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Actif</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Clôturé le {selected.endDate}</span>
                }
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Brut annuel : <strong className="text-gray-900 amount">{selected.annualGrossSalary?.toLocaleString('fr-FR')} €</strong></span>
                <span>{selected.paidMonthsPerYear} mois / an</span>
                <span>{selected.weeklyHours} h / semaine</span>
                {selected.isCadre
                  ? <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">Cadre</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Non-cadre</span>
                }
                {annualBonuses.length > 0 && (
                  <span>Primes annuelles : <strong className="text-blue-700 amount">{annualBonuses.reduce((s, b) => s + b.grossAmount, 0).toLocaleString('fr-FR')} €</strong></span>
                )}
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
                onClick={() => setShowOnCalls(true)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
              >
                Astreintes
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
          <ProjectionGrid contract={selected} annualBonuses={annualBonuses} benefits={benefits} onCalls={onCalls} />

          {/* Révisions salariales */}
          <div className="border-t border-gray-100 mt-6 pt-4">
            <button
              onClick={() => setShowRevisions(v => !v)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              {showRevisions ? '▲ Masquer l\'historique salarial' : '▼ Afficher l\'historique salarial'}
            </button>
            {showRevisions && (
              <RevisionPanel
                contractId={selected.id}
                activeRevisionId={selected.activeRevisionId}
                onRevisionChange={fetchContracts}
              />
            )}
          </div>

          {/* Séparateur + bouton primes */}
          <div className="border-t border-gray-100 mt-6 pt-4">
            <button
              onClick={() => setShowBonuses(v => !v)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              {showBonuses ? '▲ Masquer les primes' : '▼ Afficher les primes'}
            </button>
            {showBonuses && (
              <BonusPanel contractId={selected.id} onBonusChange={() => fetchAnnualBonuses(selected.id)} />
            )}
          </div>

          {/* Séparateur + bouton avantages en nature */}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <button
              onClick={() => setShowBenefits(v => !v)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              {showBenefits ? '▲ Masquer les avantages en nature' : '▼ Afficher les avantages en nature'}
            </button>
            {showBenefits && (
              <BenefitPanel
                contractId={selected.id}
                onBenefitChange={() => fetchBenefits(selected.id)}
              />
            )}
          </div>

          {/* Séparateur + bouton bulletins */}
          <div className="border-t border-gray-100 mt-4 pt-4">
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

      {/* ── Modal astreintes ── */}
      {showOnCalls && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Astreintes</h2>
              <button
                onClick={() => setShowOnCalls(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <OnCallPanel
              contractId={selected.id}
              onOnCallChange={() => fetchOnCalls(selected.id)}
            />
          </div>
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
