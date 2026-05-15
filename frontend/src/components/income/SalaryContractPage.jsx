import { useState, useEffect } from 'react'
import {
  getSalaryContracts, getSalaryContract, createSalaryContract,
  updateSalaryContract, deleteSalaryContract, getBonuses, getBenefits, getOnCalls,
} from '../../api/income'
import SalaryContractForm from './SalaryContractForm'
import DeleteConfirmModal from '../common/DeleteConfirmModal'
import ProjectionGrid from './ProjectionGrid'
import PaySlipPanel from './PaySlipPanel'
import BonusPanel from './BonusPanel'
import BenefitPanel from './BenefitPanel'
import RevisionPanel from './RevisionPanel'
import OnCallPanel from './OnCallPanel'
import { useAnalytics } from '../../hooks/useAnalytics'

export default function SalaryContractPage() {
  const { trackPageView, trackEvent } = useAnalytics()
  useEffect(() => { trackPageView('revenus.salary_contract') }, [])
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
  const [annualBonuses,   setAnnualBonuses]   = useState([])
  const [monthlyBonuses,  setMonthlyBonuses]  = useState([]) // primes MENSUELLE brutes avec dates
  const [benefits, setBenefits] = useState([])
  const [onCalls, setOnCalls] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => { fetchContracts() }, [])

  function fetchAnnualBonuses(contractId) {
    if (!contractId) { setAnnualBonuses([]); setMonthlyBonuses([]); return }
    const today = new Date().toISOString().slice(0, 10)
    getBonuses(contractId)
      .then(bs => {
        // Primes mensuelles brutes avec leurs dates pour le calcul historique dans PaySlipPanel
        setMonthlyBonuses(bs.filter(b => b.type === 'MENSUELLE'))

        const forProjection = bs
          .filter(b => {
            if (b.type === 'ANNUELLE') return true
            if (b.type === 'MENSUELLE') {
              return b.startDate <= today && (!b.endDate || b.endDate >= today)
            }
            return false // EXCEPTIONNELLE exclue des projections récurrentes
          })
          .map(b => b.type === 'MENSUELLE'
            ? { ...b, grossAmount: b.grossAmount * 12 }  // normalise en équivalent annuel
            : b
          )
        setAnnualBonuses(forProjection)
      })
      .catch(() => { setAnnualBonuses([]); setMonthlyBonuses([]) })
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

  // Re-fetch le contrat sélectionné pour mettre à jour les projections calculées
  // (monthlyActiveMensuelleGross, monthlyNetAfterTax, etc.) sans recharger toute la page.
  async function refreshSelectedContract() {
    if (!selected?.id) return
    try {
      const updated = await getSalaryContract(selected.id)
      setSelected(updated)
      setContracts(cs => cs.map(c => c.id === updated.id ? updated : c))
    } catch { /* silencieux */ }
  }

  async function handleSubmit(payload) {
    if (formTarget?.id) {
      const updated = await updateSalaryContract(formTarget.id, payload)
      setContracts(cs => cs.map(c => c.id === updated.id ? updated : c))
      setSelected(updated)
      trackEvent('FEATURE_USE', 'revenus.salary_contract.edit')
    } else {
      const created = await createSalaryContract(payload)
      setContracts(cs => [...cs, created])
      setSelected(created)
      trackEvent('FEATURE_USE', 'revenus.salary_contract.create')
    }
    setFormTarget(undefined)
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await deleteSalaryContract(deleteTarget.id)
      trackEvent('FEATURE_USE', 'revenus.salary_contract.delete')
      const remaining = contracts.filter(c => c.id !== deleteTarget.id)
      setContracts(remaining)
      setSelected(remaining[0] ?? null)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p className="text-gray-500">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Revenus salariaux</h2>
        <button
          onClick={() => { trackEvent('BUTTON_CLICK', 'revenus.salary_contract.open_form'); setFormTarget(null) }}
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
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-2">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-gray-900">
                  <span className='amount'>{selected.companyName ? `${selected.companyName} — ` : ''}</span>Contrat depuis le {selected.startDate}
                </h3>
                {!selected.endDate
                  ? <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">Actif</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Clôturé le {selected.endDate}</span>
                }
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span>Brut annuel : <strong className="text-gray-900 amount">{selected.annualGrossSalary?.toLocaleString('fr-FR')} €</strong></span>
                {selected.partTimePercentage != null && selected.partTimePercentage < 100 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
                    ⏱ {selected.partTimePercentage} % — temps partiel
                  </span>
                )}
                <span>{selected.paidMonthsPerYear} mois / an</span>
                <span>{selected.weeklyHours} h / sem.</span>
                {selected.isCadre
                  ? <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">Cadre</span>
                  : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Non-cadre</span>
                }
                {annualBonuses.length > 0 && (
                  <span>Primes : <strong className="text-blue-700 amount">{annualBonuses.reduce((s, b) => s + b.grossAmount, 0).toLocaleString('fr-FR')} €/an</strong></span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
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
                onClick={() => setDeleteTarget(selected)}
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
                contractType={selected.contractType}
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
              <BonusPanel contractId={selected.id} onBonusChange={() => {
                fetchAnnualBonuses(selected.id)
                refreshSelectedContract()
              }} />
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
              <PaySlipPanel contractId={selected.id} projection={selected} monthlyBonuses={monthlyBonuses} />
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
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-60">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl p-6 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {deleteTarget && (
        <DeleteConfirmModal
          title={`Supprimer le contrat ${deleteTarget.companyName ? `« ${deleteTarget.companyName} »` : `débutant le ${deleteTarget.startDate}`} ?`}
          description="Cette action est irréversible."
          warnings={[
            'Tous les bulletins de paie associés',
            'Toutes les révisions salariales',
            'Toutes les primes et avantages en nature',
            'Toutes les astreintes',
          ]}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}
