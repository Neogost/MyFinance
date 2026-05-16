import { useState, useEffect } from 'react'
import { getPositions } from '../../api/patrimoine'
import { getExpenseSummary } from '../../api/expenses'
import { getSalaryContracts } from '../../api/income'
import { computeSafetyNetTarget } from '../../utils/safetyNet'

const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export default function SafetyNetWidget({ user, className = '' }) {
  const [current,        setCurrent]        = useState(null)
  const [expensesSummary, setExpensesSummary] = useState(null)
  const [activeContract, setActiveContract]  = useState(null)
  const [loading,        setLoading]         = useState(true)

  useEffect(() => {
    if (!user?.safetyNetMode) { setLoading(false); return }
    const needsExpenses = user.safetyNetMode === 'MONTHS_EXPENSES'
    const needsSalary   = user.safetyNetMode === 'MONTHS_SALARY'
    Promise.all([
      getPositions(),
      needsExpenses ? getExpenseSummary() : Promise.resolve(null),
      needsSalary   ? getSalaryContracts() : Promise.resolve(null),
    ]).then(([positions, summary, contracts]) => {
      const total = positions
        .filter(p => p.status === 'ACTIVE' && (p.category === 'LIVRET' || p.category === 'LIQUIDITE'))
        .reduce((s, p) => s + parseFloat(p.computed?.currentValueEur ?? 0), 0)
      setCurrent(total)
      if (summary)   setExpensesSummary(summary)
      if (contracts) setActiveContract(contracts.find(c => c.endDate == null) ?? null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (!user?.safetyNetMode || loading) return null

  const target = computeSafetyNetTarget(user, expensesSummary, activeContract)
  if (target == null || current == null) return null

  const pct      = Math.min((current / target) * 100, 100)
  const achieved = current >= target
  const close    = !achieved && pct >= 80

  const border  = achieved ? 'border-emerald-100' : close ? 'border-amber-100' : 'border-indigo-100'
  const bg      = achieved ? 'bg-emerald-50'  : close ? 'bg-amber-50'  : 'bg-indigo-50'
  const textH   = achieved ? 'text-emerald-800 dark:text-emerald-300' : close ? 'text-amber-800 dark:text-amber-300' : 'text-indigo-800 dark:text-indigo-300'
  const textS   = achieved ? 'text-emerald-600 dark:text-emerald-400' : close ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
  const bar     = achieved ? 'bg-emerald-500'   : close ? 'bg-amber-400'   : 'bg-indigo-500'

  const modeLabel = user.safetyNetMode === 'MONTHS_EXPENSES'
    ? `${user.safetyNetMonths} mois de dépenses`
    : user.safetyNetMode === 'MONTHS_SALARY'
    ? `${user.safetyNetMonths} mois de salaire`
    : 'montant fixe'

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-sm font-semibold ${textH}`}>Matelas de sécurité</p>
          <p className={`text-xs ${textS} mt-0.5`}>
            Livrets & Liquidités · objectif {modeLabel} · <span className="amount">{fmtEur.format(target)}</span>
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`text-base font-bold ${textH} amount`}>{fmtEur.format(current)}</p>
          <p className={`text-xs ${textS}`}>{pct.toFixed(0)} %{achieved ? ' ✓' : ''}</p>
        </div>
      </div>
      <div className="w-full bg-white/60 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
