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

export default function DetteWidget({ onNavigate, className = '', size = 'md' }) {
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
  const ratioSalaire    = salaryNet && salaryNet > 0 ? (totalMensualite / salaryNet) * 100 : null

  const dettesPourProgression = debts.filter(d => parseFloat(d.initialCapital ?? 0) > 0)
  const progressionGlobale = dettesPourProgression.length > 0
    ? dettesPourProgression.reduce((s, d) => {
        const pct = (1 - parseFloat(d.remainingCapital ?? 0) / parseFloat(d.initialCapital)) * 100
        return s + Math.max(0, Math.min(100, pct))
      }, 0) / dettesPourProgression.length
    : null

  const lastEndDate  = debts.filter(d => d.endDate).map(d => d.endDate).sort().at(-1)
  const debtFreeYear = lastEndDate ? new Date(lastEndDate).getFullYear() : null

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

  const ratioDetteColor   = ratioDette == null   ? 'text-gray-500' : ratioDette < 30   ? 'text-emerald-600' : ratioDette < 60   ? 'text-amber-600' : 'text-red-600'
  const ratioSalaireColor = ratioSalaire == null  ? 'text-gray-500' : ratioSalaire < 33 ? 'text-emerald-600' : ratioSalaire < 40 ? 'text-amber-600' : 'text-red-600'
  const barColor = (pct) => pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-400'

  const ProgressBar = ({ pct, h = 'h-2', label, count }) => pct == null ? null : (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        {label
          ? <p className="text-xs text-gray-700 font-medium">{label}{count > 1 ? ` (${count})` : ''}</p>
          : <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Avancement global</p>
        }
        <p className="text-xs font-bold text-gray-700">{pct.toFixed(1)} %</p>
      </div>
      <div className={`w-full bg-gray-100 rounded-full ${h}`}>
        <div className={`${h} rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )

  // ── xs : 2 chiffres empilés + barre ──────────────────────────────────────
  if (size === 'xs') return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-col gap-3 h-full ${className}`}>
      <div className="grid grid-cols-2 gap-2 flex-1">
        <div className="bg-gray-50 rounded-lg px-3 py-3 flex flex-col justify-center">
          <p className="text-[10px] text-gray-400 mb-1">Capital restant</p>
          <p className="text-2xl font-bold text-red-600 amount leading-tight">{fmt(totalCapital)}</p>
          {ratioDette != null && (
            <p className={`text-xs font-medium mt-1 ${ratioDetteColor}`}>{ratioDette.toFixed(0)} % patrim.</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-3 flex flex-col justify-center">
          <p className="text-[10px] text-gray-400 mb-1">Mensualité</p>
          <p className="text-2xl font-bold text-gray-800 amount leading-tight">{fmtDec(totalMensualite)}</p>
          {ratioSalaire != null && (
            <p className={`text-xs font-medium mt-1 ${ratioSalaireColor}`}>{ratioSalaire.toFixed(0)} % sal.</p>
          )}
        </div>
      </div>
      {progressionGlobale != null && (
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-gray-400">Avancement</p>
            <p className="text-[10px] font-bold text-gray-600">{progressionGlobale.toFixed(1)} %</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${barColor(progressionGlobale)}`} style={{ width: `${progressionGlobale}%` }} />
          </div>
        </div>
      )}
    </div>
  )

  // ── sm : titre + 2 KPIs + barre ──────────────────────────────────────────
  if (size === 'sm') return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3 h-full ${className}`}>
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Endettement</h3>
        {debtFreeYear && <p className="text-xs text-emerald-600 font-medium mt-0.5">Libre en {debtFreeYear}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <div className="bg-gray-50 rounded-lg px-3 py-3 flex flex-col justify-center">
          <p className="text-xs text-gray-400 mb-1">Capital restant dû</p>
          <p className="text-xl font-bold text-red-600 amount leading-tight">{fmt(totalCapital)}</p>
          {ratioDette != null && (
            <p className={`text-xs mt-1 font-medium ${ratioDetteColor}`}>{ratioDette.toFixed(1)} % du patrimoine</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-3 flex flex-col justify-center">
          <p className="text-xs text-gray-400 mb-1">Mensualité totale</p>
          <p className="text-xl font-bold text-gray-800 amount leading-tight">{fmtDec(totalMensualite)}</p>
          {ratioSalaire != null && (
            <p className={`text-xs mt-1 font-medium ${ratioSalaireColor}`}>{ratioSalaire.toFixed(1)} % du salaire</p>
          )}
        </div>
      </div>
      {typeProgressions.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
          {typeProgressions.map(t => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-700">{t.label}{t.count > 1 ? ` (${t.count})` : ''}</p>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="text-gray-400 amount">{fmt(Math.round(t.remaining))}</span>
                  <span className="font-semibold text-gray-600">{t.pct.toFixed(1)} %</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${barColor(t.pct)}`} style={{ width: `${t.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {progressionGlobale != null && <ProgressBar pct={progressionGlobale} h="h-2" />}
    </div>
  )

  // ── md : titre + 3 KPIs + détail crédits + barre globale ────────────────
  if (size === 'md') return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 h-full ${className}`}>
      <div className="shrink-0">
        <h3 className="text-base font-semibold text-gray-800">Endettement</h3>
        <p className="text-xs text-gray-400 mt-0.5">Capital restant dû, charge mensuelle et avancement du remboursement.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Capital restant dû</p>
          <p className="text-base font-bold text-red-600 amount">{fmt(totalCapital)}</p>
          {ratioDette != null && (
            <p className={`text-xs mt-0.5 font-medium ${ratioDetteColor}`}>{ratioDette.toFixed(1)} % du patrimoine</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Mensualité totale</p>
          <p className="text-base font-bold text-gray-800 amount">{fmtDec(totalMensualite)}</p>
          {ratioSalaire != null
            ? <p className={`text-xs mt-0.5 font-medium ${ratioSalaireColor}`}>{ratioSalaire.toFixed(1)} % du salaire net</p>
            : <p className="text-xs text-gray-400 mt-0.5">capital + assurance</p>
          }
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Crédits en cours</p>
          <p className="text-base font-bold text-gray-800">{summary.totalCount}</p>
          {debtFreeYear
            ? <p className="text-xs text-emerald-600 mt-0.5 font-medium">Libre en {debtFreeYear}</p>
            : <p className="text-xs text-gray-400 mt-0.5">{summary.byType?.length ?? 0} type{(summary.byType?.length ?? 0) > 1 ? 's' : ''}</p>
          }
        </div>
      </div>

      {/* Détail par dette individuelle */}
      {dettesPourProgression.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {dettesPourProgression.map((d, i) => {
            const remaining  = parseFloat(d.remainingCapital ?? 0)
            const initial    = parseFloat(d.initialCapital ?? 0)
            const pct        = Math.max(0, Math.min(100, (1 - remaining / initial) * 100))
            const endYear    = d.endDate ? new Date(d.endDate).getFullYear() : null
            const typeLabel  = DETTE_TYPE_LABELS[d.type] ?? d.type
            const annualRate = d.annualRate != null ? parseFloat(d.annualRate) : null

            // Intérêts restants estimés pour cette dette
            let debtInterest = null
            if (d.endDate && d.monthlyPayment) {
              const end = new Date(d.endDate)
              const monthsLeft = Math.max(0,
                (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth())
              )
              const interest = parseFloat(d.monthlyPayment) * monthsLeft - remaining
              debtInterest = Math.max(0, interest)
            }

            return (
              <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                {/* Ligne titre */}
                <div className="flex items-center justify-between mb-1">
                  <div className="min-w-0 mr-2 flex items-center gap-1.5">
                    <p className="text-xs font-medium text-gray-700 truncate">{d.label || typeLabel}</p>
                    <p className="text-[10px] text-gray-400 shrink-0">
                      {d.label ? typeLabel : ''}{endYear ? ` · ${endYear}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {annualRate != null && (
                      <span className="text-[10px] text-gray-400">{annualRate.toFixed(2)} %</span>
                    )}
                    <span className="text-gray-500 amount">{fmt(Math.round(remaining))}</span>
                    <span className="font-semibold text-gray-600 w-9 text-right">{pct.toFixed(0)} %</span>
                  </div>
                </div>
                {/* Barre */}
                <div className="w-full bg-gray-200 rounded-full h-1 mb-1.5">
                  <div className={`h-1 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
                {/* Intérêts restants */}
                {debtInterest != null && debtInterest > 10 && (
                  <p className="text-[10px] text-gray-400">
                    Intérêts restants <span className="font-medium text-amber-600 amount">{fmt(Math.round(debtInterest))}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {progressionGlobale != null && (
        <div className="shrink-0 pt-1 border-t border-gray-100">
          <ProgressBar pct={progressionGlobale} h="h-2.5" />
          <p className="text-xs text-gray-400 mt-1">
            Moyenne sur {dettesPourProgression.length} crédit{dettesPourProgression.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )

  // ── lg : complet avec détail individuel par crédit ───────────────────────
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5 h-full ${className}`}>
      <div className="shrink-0">
        <h3 className="text-base font-semibold text-gray-800">Endettement</h3>
        <p className="text-xs text-gray-400 mt-0.5">Capital restant dû, charge mensuelle et avancement du remboursement.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Capital restant dû</p>
          <p className="text-base font-bold text-red-600 amount">{fmt(totalCapital)}</p>
          {ratioDette != null && <p className={`text-xs mt-0.5 font-medium ${ratioDetteColor}`}>{ratioDette.toFixed(1)} % du patrimoine</p>}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Mensualité totale</p>
          <p className="text-base font-bold text-gray-800 amount">{fmtDec(totalMensualite)}</p>
          {ratioSalaire != null
            ? <p className={`text-xs mt-0.5 font-medium ${ratioSalaireColor}`}>{ratioSalaire.toFixed(1)} % du salaire net</p>
            : <p className="text-xs text-gray-400 mt-0.5">capital + assurance</p>}
        </div>
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Crédits en cours</p>
          <p className="text-base font-bold text-gray-800">{summary.totalCount}</p>
          {debtFreeYear
            ? <p className="text-xs text-emerald-600 mt-0.5 font-medium">Libre en {debtFreeYear}</p>
            : <p className="text-xs text-gray-400 mt-0.5">{summary.byType?.length ?? 0} type{(summary.byType?.length ?? 0) > 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Détail individuel par crédit */}
      {dettesPourProgression.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
          {dettesPourProgression.map((d, i) => {
            const remaining   = parseFloat(d.remainingCapital ?? 0)
            const initial     = parseFloat(d.initialCapital ?? 0)
            const pct         = Math.max(0, Math.min(100, (1 - remaining / initial) * 100))
            const typeLabel   = DETTE_TYPE_LABELS[d.type] ?? d.type
            const endYear     = d.endDate ? new Date(d.endDate).getFullYear() : null
            const annualRate  = d.annualRate != null ? parseFloat(d.annualRate) : null
            const insRate     = d.insuranceRate != null ? parseFloat(d.insuranceRate) : null
            return (
              <div key={i} className="border border-gray-100 rounded-lg px-3 py-2.5">
                {/* En-tête : label + badges | montant */}
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-gray-800 truncate">{d.label || typeLabel}</p>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{typeLabel}</span>
                    {d.lender && <span className="text-[10px] text-gray-400 shrink-0">{d.lender}</span>}
                    {endYear && <span className="text-[10px] text-emerald-600 font-medium shrink-0">· {endYear}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-red-600 amount">{fmt(Math.round(remaining))}</p>
                    <p className="text-[10px] text-gray-400">/ {fmt(Math.round(initial))}</p>
                  </div>
                </div>

                {/* Barre */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500 shrink-0">{pct.toFixed(1)} %</span>
                </div>

                {/* Métriques inline */}
                <div className="flex items-center gap-3 flex-wrap">
                  {d.monthlyPayment != null && (
                    <span className="text-[10px] text-gray-400">
                      Mensualité <span className="font-semibold text-gray-600 amount">{fmtDec(parseFloat(d.monthlyPayment))}</span>
                    </span>
                  )}
                  {annualRate != null && (
                    <span className="text-[10px] text-gray-400">
                      Taux <span className="font-semibold text-gray-600">{annualRate.toFixed(2)} %</span>
                    </span>
                  )}
                  {insRate != null && insRate > 0 && (
                    <span className="text-[10px] text-gray-400">
                      Ass. <span className="font-semibold text-gray-600">{insRate.toFixed(2)} %</span>
                    </span>
                  )}
                  {d.startDate && (
                    <span className="text-[10px] text-gray-400">
                      Depuis <span className="font-semibold text-gray-600">
                        {new Date(d.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {progressionGlobale != null && (
        <div className="shrink-0 pt-1 border-t border-gray-100">
          <ProgressBar pct={progressionGlobale} h="h-2.5" />
          <p className="text-xs text-gray-400 mt-1">
            Moyenne sur {dettesPourProgression.length} crédit{dettesPourProgression.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
