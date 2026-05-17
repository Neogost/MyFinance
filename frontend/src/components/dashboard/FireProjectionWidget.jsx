import { useEffect, useState } from 'react'
import { getSalaryContracts, getOtherIncomes } from '../../api/income'
import { getPositions } from '../../api/patrimoine'
import { simulateTax } from '../../api/tools'
import { getExpenseSummary } from '../../api/expenses'
import { PROJECTION_RATES } from '../patrimoine/constants'

function fmt(n) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatRow({ label, value, valueClass = 'text-gray-700', sub }) {
  return (
    <div className="flex justify-between items-baseline text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${valueClass}`}>
        {value}
        {sub && <span className="font-normal text-gray-400 ml-1">{sub}</span>}
      </span>
    </div>
  )
}

export default function FireProjectionWidget({ size = 'md' }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getSalaryContracts(),
      getOtherIncomes(),
      getPositions({ status: 'ACTIVE' }),
      simulateTax().catch(() => null),
      getExpenseSummary(),
    ]).then(([contracts, otherIncomes, positions, taxResult, expenseSummary]) => {

      const activeContract = contracts.find(c => !c.endDate) ?? contracts[0] ?? null
      const monthlySalary  = activeContract?.monthlyNetAfterTax ?? activeContract?.monthlyNetImposable ?? 0

      const totalOtherIncome = otherIncomes
        .filter(oi => ['LOCATIF', 'DIVIDENDE', 'AIDE_SOCIALE'].includes(oi.type))
        .reduce((s, oi) => s + (oi.amount ?? 0), 0)

      const totalInvestIncome = positions.reduce((s, pos) => {
        if (!['BOURSE', 'CRYPTO', 'IMMO_PAPIER', 'LIVRET'].includes(pos.category)) return s
        return s + ((pos.computed?.currentValueEur ?? 0) * (PROJECTION_RATES[pos.category] ?? 0)) / 12
      }, 0)

      const totalRevenues = monthlySalary + totalOtherIncome + totalInvestIncome

      const totalExpensesBase = (expenseSummary?.byCategory ?? [])
        .reduce((s, e) => s + (e.monthlyAmount ?? 0), 0)
      const monthlyTax    = taxResult?.totalEstimatedTax != null ? taxResult.totalEstimatedTax / 12 : 0
      const totalExpenses = totalExpensesBase + monthlyTax

      const actifByCategory = {}
      positions.forEach(pos => {
        if (pos.category === 'IMMO_PHYSIQUE') return
        const val = pos.computed?.currentValueEur ?? 0
        actifByCategory[pos.category] = (actifByCategory[pos.category] ?? 0) + val
      })
      const totalActif = Object.values(actifByCategory).reduce((s, v) => s + v, 0)

      const delta             = totalRevenues - totalExpenses
      const tauxEpargne       = totalRevenues > 0 ? (delta / totalRevenues) * 100 : null
      const depensesAnnuelles = totalExpenses * 12
      const fireTarget        = depensesAnnuelles * 25
      const fireProgress      = fireTarget > 0 ? Math.min((totalActif / fireTarget) * 100, 100) : 0
      const fireAtteint       = totalActif >= fireTarget && fireTarget > 0

      const weightedRate = totalActif > 0
        ? Object.entries(actifByCategory)
            .reduce((s, [cat, val]) => s + val * (PROJECTION_RATES[cat] ?? 0), 0) / totalActif
        : 0.05

      // Revenus passifs mensuels projetés (sans le salaire)
      const revenusPassifsMensuels = (totalActif * weightedRate) / 12 + totalOtherIncome
      const couverturePassive = totalExpenses > 0
        ? Math.min((revenusPassifsMensuels / totalExpenses) * 100, 100)
        : 0

      const yearsToFire = (() => {
        if (fireAtteint) return 0
        if (fireTarget <= 0) return null
        const r   = Math.pow(1 + weightedRate, 1 / 12) - 1
        const PV  = totalActif
        const PMT = delta
        const FV  = fireTarget
        if (r > 0 && PMT + PV * r > 0) {
          const n = Math.log((FV * r + PMT) / (PV * r + PMT)) / Math.log(1 + r)
          return n > 0 ? n / 12 : null
        }
        if (PMT > 0) return (FV - PV) / PMT / 12
        return null
      })()

      setData({
        totalActif, fireTarget, fireProgress, fireAtteint,
        yearsToFire, weightedRate, delta, tauxEpargne,
        depensesAnnuelles, totalExpenses,
        revenusPassifsMensuels, couverturePassive,
      })
    })
    .catch(() => setData(null))
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chargement…</div>
  )
  if (!data || data.fireTarget <= 0) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
      Renseignez vos dépenses pour calculer votre objectif FIRE.
    </div>
  )

  const {
    totalActif, fireTarget, fireProgress, fireAtteint,
    yearsToFire, weightedRate, delta, tauxEpargne,
    depensesAnnuelles, totalExpenses,
    revenusPassifsMensuels, couverturePassive,
  } = data

  const targetYear = new Date().getFullYear() + Math.ceil(yearsToFire ?? 0)

  // ── xs : chiffre clé + barre ─────────────────────────────────────────────────
  if (size === 'xs') return (
    <div className="flex flex-col h-full justify-between py-1">
      <p className="text-[10px] text-violet-500 uppercase tracking-wide font-semibold">FIRE</p>
      <div className="text-center">
        {fireAtteint ? (
          <p className="text-xl font-bold text-violet-700">🎉</p>
        ) : yearsToFire != null ? (
          <>
            <span className="text-3xl font-bold text-violet-700">~{yearsToFire.toFixed(0)}</span>
            <span className="text-sm text-violet-500 ml-1">ans</span>
            <p className="text-xs text-violet-400 mt-0.5">vers {targetYear}</p>
          </>
        ) : (
          <p className="text-xs text-violet-400 italic">Épargne insuffisante</p>
        )}
      </div>
      <div>
        <div className="flex justify-between text-xs text-violet-500 mb-1">
          <span>{fireProgress.toFixed(0)} %</span>
          <span className="amount">{fmt(totalActif)} €</span>
        </div>
        <div className="relative w-full bg-violet-100 rounded-full h-2">
          <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${fireProgress}%` }} />
        </div>
      </div>
    </div>
  )

  // ── sm : + autonomie passive ──────────────────────────────────────────────────
  if (size === 'sm') return (
    <div className="flex flex-col h-full space-y-3">
      <p className="text-xs text-violet-500 uppercase tracking-wide font-semibold shrink-0">
        Indépendance Financière (FIRE)
      </p>
      <div className="shrink-0">
        {fireAtteint ? (
          <p className="text-2xl font-bold text-violet-700">🎉 Objectif atteint !</p>
        ) : yearsToFire != null ? (
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold text-violet-700">~{yearsToFire.toFixed(1)}</span>
              <span className="text-lg text-violet-500 ml-1">ans</span>
            </div>
            <span className="text-sm font-bold text-violet-600">vers {targetYear}</span>
          </div>
        ) : (
          <p className="text-sm text-violet-400 italic">Épargne insuffisante pour projeter</p>
        )}
      </div>
      <div className="shrink-0">
        <div className="flex justify-between text-xs text-violet-600 mb-1">
          <span className="amount font-semibold">{fmt(totalActif)} €</span>
          <span className="font-bold">{fireProgress.toFixed(1)} %</span>
          <span className="amount text-violet-400">{fmt(fireTarget)} €</span>
        </div>
        <div className="relative w-full bg-violet-100 rounded-full h-2.5">
          <div className="bg-violet-500 h-2.5 rounded-full" style={{ width: `${fireProgress}%` }} />
          {[25, 50, 75].map(pct => (
            <div key={pct} className="absolute top-0 h-2.5 w-px bg-white/70" style={{ left: `${pct}%` }} />
          ))}
        </div>
      </div>
      <div className="flex-1 bg-white/60 rounded-lg p-3 space-y-1.5 min-h-0">
        <p className="text-xs font-semibold text-violet-700">Autonomie passive</p>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Revenus passifs / mois</span>
          <span className="font-semibold text-gray-700 amount">{fmt(revenusPassifsMensuels)} €</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${couverturePassive}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-right">
          <span className={`font-semibold ${couverturePassive >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
            {couverturePassive.toFixed(1)} %
          </span>
          {' '}couverts sans salaire
        </p>
      </div>
    </div>
  )

  // ── md / lg : affichage complet ───────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-4">
      <p className="text-xs text-violet-500 uppercase tracking-wide font-semibold shrink-0">
        Indépendance Financière (FIRE)
      </p>
      <div className="shrink-0">
        {fireAtteint ? (
          <p className="text-2xl font-bold text-violet-700">🎉 Objectif atteint !</p>
        ) : yearsToFire != null ? (
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-bold text-violet-700">~{yearsToFire.toFixed(1)}</span>
              <span className="text-lg text-violet-500 ml-1">ans</span>
            </div>
            <span className="text-sm font-bold text-violet-600">vers {targetYear}</span>
          </div>
        ) : (
          <p className="text-sm text-violet-400 italic">Épargne insuffisante pour projeter</p>
        )}
      </div>
      <div className="shrink-0">
        <div className="flex justify-between text-xs text-violet-600 mb-1.5">
          <div>
            <span className="amount font-semibold">{fmt(totalActif)} €</span>
            <span className="text-violet-300 ml-1">actif financier</span>
          </div>
          <span className="font-bold">{fireProgress.toFixed(1)} %</span>
          <div className="text-right">
            <span className="amount text-violet-400">{fmt(fireTarget)} €</span>
            <span className="text-violet-300 ml-1">objectif</span>
          </div>
        </div>
        <div className="relative w-full bg-violet-100 rounded-full h-3">
          <div className="bg-violet-500 h-3 rounded-full transition-all" style={{ width: `${fireProgress}%` }} />
          {[25, 50, 75].map(pct => (
            <div key={pct} className="absolute top-0 h-3 w-px bg-white/70" style={{ left: `${pct}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-violet-300 mt-0.5 px-0.5">
          <span>0</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span>
        </div>
      </div>
      <div className="bg-white/60 rounded-lg p-3 space-y-1.5 shrink-0">
        <p className="text-xs font-semibold text-violet-700 mb-2">Autonomie passive actuelle</p>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Revenus passifs / mois</span>
          <span className="font-semibold text-gray-700 amount">{fmt(revenusPassifsMensuels)} €</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">Dépenses / mois</span>
          <span className="font-semibold text-gray-700 amount">{fmt(totalExpenses)} €</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
          <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${couverturePassive}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-right">
          <span className={`font-semibold ${couverturePassive >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
            {couverturePassive.toFixed(1)} %
          </span>
          {' '}des dépenses couvertes sans salaire
        </p>
      </div>
      <div className="flex-1 space-y-2 pt-1 border-t border-violet-100 min-h-0">
        <StatRow label="Taux d'épargne" value={tauxEpargne != null ? `${tauxEpargne.toFixed(1)} %` : '—'}
          valueClass={tauxEpargne != null && tauxEpargne >= 0 ? 'text-emerald-600' : 'text-red-600'} />
        <StatRow label="Épargne mensuelle" value={`${fmt(delta)} €`}
          valueClass={delta >= 0 ? 'text-gray-700 amount' : 'text-red-600'} />
        <StatRow label="Rendement pondéré" value={`${(weightedRate * 100).toFixed(1)} %`} sub="/ an" />
        <StatRow label="Dépenses annuelles" value={`${fmt(depensesAnnuelles)} €`} valueClass="amount" />
      </div>
    </div>
  )
}
