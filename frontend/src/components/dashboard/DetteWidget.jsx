import { useState, useEffect } from 'react'
import { getDebts, getDebtsSummary } from '../../api/debts'
import { getPositions } from '../../api/patrimoine'
import { getSalaryContracts } from '../../api/income'

const fmt    = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
const fmtDec = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

const DETTE_TYPE_LABELS = {
  IMMOBILIER:   'Immobilier',
  ETUDIANT:     'Étudiant',
  VEHICULE:     'Véhicule',
  CONSOMMATION: 'Consommation',
  AUTRE:        'Autre',
}

export default function DetteWidget({ onNavigate }) {
  const [summary,        setSummary]        = useState(null)
  const [debts,          setDebts]          = useState([])
  const [patrimoineBrut, setPatrimoineBrut] = useState(null)
  const [salaryNet,      setSalaryNet]      = useState(null)
  const [loading,        setLoading]        = useState(true)

  useEffect(() => {
    Promise.all([
      getDebtsSummary().catch(() => null),
      getDebts().catch(() => []),
      getPositions({ status: 'ACTIVE' }).catch(() => []),
      getSalaryContracts().catch(() => []),
    ]).then(([s, d, positions, contracts]) => {
      setSummary(s)
      setDebts(d)
      const brut = positions.reduce((acc, p) => acc + parseFloat(p.computed?.currentValueEur ?? 0), 0)
      setPatrimoineBrut(brut)
      const activeContract = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
      if (activeContract) {
        const net = activeContract.monthlyNetAfterTax ?? activeContract.monthlyNetImposable ?? null
        setSalaryNet(net ? parseFloat(net) : null)
      }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!summary || summary.totalCount === 0) return null

  const totalCapital    = parseFloat(summary.totalRemainingCapital ?? 0)
  const totalMensualite = parseFloat(summary.totalMonthlyCost      ?? 0)
  const ratioDette      = patrimoineBrut > 0 ? (totalCapital / patrimoineBrut) * 100 : null

  // Avancement moyen
  const dettesPourProgression = debts.filter(d => parseFloat(d.initialCapital ?? 0) > 0)
  const progressionGlobale = dettesPourProgression.length > 0
    ? dettesPourProgression.reduce((s, d) => {
        const pct = (1 - parseFloat(d.remainingCapital ?? 0) / parseFloat(d.initialCapital)) * 100
        return s + Math.max(0, Math.min(100, pct))
      }, 0) / dettesPourProgression.length
    : null

  // 1. Date de fin du dernier crédit
  const lastEndDate = debts
    .filter(d => d.endDate)
    .map(d => d.endDate)
    .sort()
    .at(-1)
  const debtFreeYear = lastEndDate ? new Date(lastEndDate).getFullYear() : null

  // 2. Ratio d'endettement mensuel vs salaire net
  const ratioSalaire = salaryNet && salaryNet > 0 ? (totalMensualite / salaryNet) * 100 : null

  // 3. Intérêts restants estimés (mensualité × mois restants − capital restant)
  const today = new Date()
  const totalRemainingInterest = debts.reduce((sum, d) => {
    if (!d.endDate || !d.monthlyPayment) return sum
    const end = new Date(d.endDate)
    const monthsRemaining = Math.max(0,
      (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth())
    )
    const interest = parseFloat(d.monthlyPayment) * monthsRemaining - parseFloat(d.remainingCapital ?? 0)
    return sum + Math.max(0, interest)
  }, 0)

  // 5. Progression par type (tous types)
  const debtsByType = {}
  debts.forEach(d => {
    if (!debtsByType[d.type]) debtsByType[d.type] = []
    debtsByType[d.type].push(d)
  })
  const typeProgressions = Object.entries(debtsByType)
    .map(([type, typedDebts]) => {
      const withInitial = typedDebts.filter(d => parseFloat(d.initialCapital ?? 0) > 0)
      if (withInitial.length === 0) return null
      const pct = withInitial.reduce((s, d) => {
        const p = (1 - parseFloat(d.remainingCapital ?? 0) / parseFloat(d.initialCapital)) * 100
        return s + Math.max(0, Math.min(100, p))
      }, 0) / withInitial.length
      const remaining = typedDebts.reduce((s, d) => s + parseFloat(d.remainingCapital ?? 0), 0)
      return { type, label: DETTE_TYPE_LABELS[type] ?? type, pct, remaining, count: typedDebts.length }
    })
    .filter(Boolean)
    .sort((a, b) => b.remaining - a.remaining)

  const ratioDetteColor = ratioDette == null ? 'text-gray-500'
    : ratioDette < 30 ? 'text-emerald-600'
    : ratioDette < 60 ? 'text-amber-600'
    : 'text-red-600'

  const ratioSalaireColor = ratioSalaire == null ? 'text-gray-500'
    : ratioSalaire < 33 ? 'text-emerald-600'
    : ratioSalaire < 40 ? 'text-amber-600'
    : 'text-red-600'

  const barColor = (pct) => pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-400'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Endettement</h3>
          <p className="text-xs text-gray-400 mt-0.5">Capital restant dû, charge mensuelle et avancement du remboursement.</p>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Capital restant dû</p>
          <p className="text-base font-bold text-red-600 amount">{fmt(totalCapital)}</p>
          {ratioDette != null && (
            <p className={`text-xs mt-0.5 font-medium ${ratioDetteColor}`}>
              {ratioDette.toFixed(1)} % du patrimoine
            </p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Mensualité totale</p>
          <p className="text-base font-bold text-gray-800 amount">{fmtDec(totalMensualite)}</p>
          {ratioSalaire != null ? (
            <p className={`text-xs mt-0.5 font-medium ${ratioSalaireColor}`}>
              {ratioSalaire.toFixed(1)} % du salaire net
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">capital + assurance</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Crédits en cours</p>
          <p className="text-base font-bold text-gray-800">{summary.totalCount}</p>
          {debtFreeYear ? (
            <p className="text-xs text-emerald-600 mt-0.5 font-medium">Libre en {debtFreeYear}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              {summary.byType?.length ?? 0} type{(summary.byType?.length ?? 0) > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Intérêts restants ── */}
      {totalRemainingInterest > 100 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-700">Intérêts restants estimés</p>
            <p className="text-xs text-amber-500 mt-0.5">Coût du crédit restant à payer (hors assurance)</p>
          </div>
          <p className="text-sm font-bold text-amber-700 shrink-0 amount">{fmt(Math.round(totalRemainingInterest))}</p>
        </div>
      )}

      {/* ── Progression globale ── */}
      {progressionGlobale != null && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Avancement global</p>
            <p className="text-xs font-bold text-gray-700">{progressionGlobale.toFixed(1)} %</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${barColor(progressionGlobale)}`}
              style={{ width: `${progressionGlobale}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Moyenne sur {dettesPourProgression.length} crédit{dettesPourProgression.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ── Progression par type ── */}
      {typeProgressions.length > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Par type de crédit</p>
          {typeProgressions.map(t => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-700 font-medium">
                  {t.label}{t.count > 1 ? ` (${t.count})` : ''}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                  <span className="amount">{fmt(Math.round(t.remaining))} restant</span>
                  <span className="font-semibold text-gray-600">{t.pct.toFixed(1)} %</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${barColor(t.pct)}`}
                  style={{ width: `${t.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
