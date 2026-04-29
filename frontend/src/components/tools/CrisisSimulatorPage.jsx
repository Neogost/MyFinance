import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getPositions } from '../../api/patrimoine'
import { getPossessionsSummary } from '../../api/possessions'
import { getDebtsSummary } from '../../api/debts'
import { getExpenseSummary } from '../../api/expenses'
import { getSalaryContracts } from '../../api/income'
import { computeSafetyNetTarget } from '../../utils/safetyNet'
import { SCENARIOS, SCENARIO_ORDER, CATEGORY_ORDER, CATEGORY_LABELS } from './crisisScenarios'

const LONG_TERM_RETURN = 0.07

const fmtEur = (n) => n == null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const fmtPct = (n) => n == null ? '—' : (n > 0 ? '+' : '') + Math.round(n * 100) + ' %'
const fmtEurShort = (n) => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + ' M€'
  if (abs >= 1e3) return Math.round(n / 1e3) + ' k€'
  return Math.round(n) + ' €'
}

function computeRecoveryYears(postCrisis, target, annualReturn, annualSavings) {
  if (target <= 0 || postCrisis >= target) return 0
  let value = postCrisis
  for (let year = 1; year <= 50; year++) {
    value = value * (1 + annualReturn) + annualSavings
    if (value >= target) return year
  }
  return null
}

function ResilienceScore({ score }) {
  const label     = score >= 7 ? 'Résilient' : score >= 4 ? 'Modéré' : 'Vulnérable'
  const ringColor = score >= 7 ? 'text-emerald-500' : score >= 4 ? 'text-amber-500' : 'text-red-500'
  const bgColor   = score >= 7 ? 'bg-emerald-50'   : score >= 4 ? 'bg-amber-50'   : 'bg-red-50'
  const radius = 28
  const circ   = 2 * Math.PI * radius
  const dash   = circ * score / 10
  return (
    <div className={`flex items-center gap-4 px-5 py-4 rounded-xl ${bgColor}`}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx="36" cy="36" r={radius} fill="none"
          stroke="currentColor" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" className={ringColor}
        />
        <text x="36" y="40" textAnchor="middle" fontSize="18" fontWeight="bold"
          fill="currentColor" className={ringColor}>{score}</text>
      </svg>
      <div>
        <p className={`text-lg font-bold ${ringColor}`}>{label}</p>
        <p className="text-xs text-gray-500">Score de résilience · /10</p>
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1 font-medium">An {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name} : <span className="amount">{fmtEur(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

export default function CrisisSimulatorPage({ user }) {
  const [scenarioId,      setScenarioId]      = useState('subprime-2008')
  const [customPcts,      setCustomPcts]      = useState({ BOURSE: -30, IMMO_PAPIER: -15, IMMO_PHYSIQUE: -10, CRYPTO: -50, LIVRET: 0, LIQUIDITE: 0 })
  const [jobLoss,         setJobLoss]         = useState(false)
  const [jobLossMonths,   setJobLossMonths]   = useState(6)
  const [reinvestPct,     setReinvestPct]     = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [categoryValues,  setCategoryValues]  = useState({})
  const [totalPassif,     setTotalPassif]     = useState(0)
  const [totalDettes,     setTotalDettes]     = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [activeContract,  setActiveContract]  = useState(null)

  useEffect(() => {
    Promise.all([
      getPositions({ status: 'ACTIVE' }),
      getPossessionsSummary(),
      getExpenseSummary(),
      getSalaryContracts(),
      getDebtsSummary().catch(() => null),
    ]).then(([positions, possessions, expenses, contracts, debts]) => {
      const catVals = {}
      positions.forEach(p => {
        const val = parseFloat(p.computed?.currentValueEur ?? 0)
        catVals[p.category] = (catVals[p.category] ?? 0) + val
      })
      setCategoryValues(catVals)
      setTotalPassif(possessions?.totalEffectiveValue ?? 0)
      setTotalDettes(debts?.totalRemainingCapital ?? 0)
      setMonthlyExpenses(expenses?.totalMonthlyExpenses ?? 0)
      setActiveContract(contracts.find(c => c.endDate == null) ?? null)
    }).catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false))
  }, [])

  const scenario = useMemo(() => {
    if (scenarioId !== 'custom') return SCENARIOS[scenarioId]
    return {
      ...SCENARIOS.custom,
      drawdowns: Object.fromEntries(
        Object.entries(customPcts).map(([k, v]) => [k, v / 100])
      ),
    }
  }, [scenarioId, customPcts])

  const categoryImpact = useMemo(() => {
    const result = {}
    CATEGORY_ORDER.forEach(cat => {
      const before   = categoryValues[cat] ?? 0
      const drawdown = scenario.drawdowns[cat] ?? 0
      const after    = before * (1 + drawdown)
      result[cat] = { before, after, drawdown, loss: after - before }
    })
    return result
  }, [categoryValues, scenario])

  const patrimoineBrutBefore = Object.values(categoryValues).reduce((s, v) => s + v, 0)
  const patrimoineBrutAfter  = Object.values(categoryImpact).reduce((s, v) => s + v.after, 0)
  const totalPassifEtDettes  = totalPassif + totalDettes
  const patrimoineNetBefore  = patrimoineBrutBefore - totalPassifEtDettes
  const patrimoineNetAfter   = patrimoineBrutAfter  - totalPassifEtDettes
  const totalLoss            = patrimoineBrutAfter - patrimoineBrutBefore
  const totalLossPct         = patrimoineBrutBefore > 0 ? totalLoss / patrimoineBrutBefore : 0

  const monthlySalary  = activeContract?.monthlyNetAfterTax ?? activeContract?.monthlyNetImposable ?? 0
  const annualSavings  = jobLoss ? 0 : (monthlySalary - monthlyExpenses) * 12

  const snTarget        = computeSafetyNetTarget(user, { totalMonthlyExpenses: monthlyExpenses }, activeContract)
  const liquiditesAfter = (categoryImpact.LIQUIDITE?.after ?? 0) + (categoryImpact.LIVRET?.after ?? 0)

  // Erosion du matelas pendant le chômage
  const totalJobLossExpenses       = jobLoss ? jobLossMonths * monthlyExpenses : 0
  const liquiditesApresChomage     = jobLoss ? Math.max(0, liquiditesAfter - totalJobLossExpenses) : liquiditesAfter
  const erosionMatelas             = jobLoss ? Math.min(liquiditesAfter, totalJobLossExpenses) : 0
  const patrimoineBrutApresChomage = patrimoineBrutAfter - erosionMatelas

  const liquiditesAffichees = jobLoss ? liquiditesApresChomage : liquiditesAfter
  const moisCouverts        = monthlyExpenses > 0 ? liquiditesAffichees / monthlyExpenses : null

  const recoveryStart = jobLoss ? patrimoineBrutApresChomage : patrimoineBrutAfter
  const recoveryYears = computeRecoveryYears(recoveryStart, patrimoineBrutBefore, scenario.postCrisisReturn, annualSavings)

  // Réallocation post-crise : rachat au creux
  const bourseDrawdown        = scenario.drawdowns.BOURSE ?? 0
  const canReinvest           = bourseDrawdown < 0 && liquiditesAffichees > 0
  const reinvestAmount        = liquiditesAffichees * reinvestPct / 100
  const reinvestBonus         = canReinvest && reinvestAmount > 0
    ? reinvestAmount * (1 / (1 + bourseDrawdown) - 1)
    : 0
  const recoveryStartReinvest = recoveryStart + reinvestBonus
  const recoveryYearsReinvest = computeRecoveryYears(recoveryStartReinvest, patrimoineBrutBefore, scenario.postCrisisReturn, annualSavings)
  const recoverySaved         = recoveryYears != null && recoveryYearsReinvest != null
    ? recoveryYears - recoveryYearsReinvest : null

  // Score de résilience (0–10)
  const lossScore       = Math.max(0, 10 * (1 - Math.abs(totalLossPct) / 0.5))
  const matScore        = Math.min(10, ((moisCouverts ?? 0) * 10) / 6)
  const recScore        = recoveryYears === null ? 0 : Math.max(0, 10 * (1 - recoveryYears / 15))
  const resilienceScore = Math.round(lossScore * 0.4 + matScore * 0.3 + recScore * 0.3)

  // Épuisement mois par mois
  const depletionSteps = useMemo(() => {
    if (!jobLoss || monthlyExpenses <= 0 || liquiditesAfter <= 0) return []
    const step  = jobLossMonths > 12 ? Math.ceil(jobLossMonths / 12) : 1
    const steps = []
    for (let m = 0; m <= jobLossMonths; m += step) {
      steps.push({ month: m, value: Math.max(0, liquiditesAfter - m * monthlyExpenses) })
    }
    if (steps[steps.length - 1].month !== jobLossMonths)
      steps.push({ month: jobLossMonths, value: Math.max(0, liquiditesAfter - jobLossMonths * monthlyExpenses) })
    return steps
  }, [jobLoss, jobLossMonths, monthlyExpenses, liquiditesAfter])

  // Impact FIRE (règle des 4 % — rendement long terme 7 %)
  const fireTarget        = monthlyExpenses > 0 ? monthlyExpenses * 12 * 25 : null
  const yearsToFireBefore = fireTarget ? computeRecoveryYears(patrimoineBrutBefore, fireTarget, LONG_TERM_RETURN, annualSavings) : null
  const yearsToFireAfter  = fireTarget ? computeRecoveryYears(recoveryStart, fireTarget, LONG_TERM_RETURN, annualSavings) : null
  const fireDelay         = yearsToFireBefore != null && yearsToFireAfter != null
    ? yearsToFireAfter - yearsToFireBefore : null
  const showFireSection   = fireTarget != null && (yearsToFireBefore != null || yearsToFireAfter != null)

  // Courbe de récupération (Recharts)
  const chartData = useMemo(() => {
    const maxYears = Math.min(50, Math.max(
      recoveryYears ?? 0,
      reinvestPct > 0 ? (recoveryYearsReinvest ?? 0) : 0,
    ))
    if (maxYears === 0) return []
    const data = []
    let base = recoveryStart
    let reinv = recoveryStartReinvest
    for (let y = 0; y <= maxYears; y++) {
      const point = { year: y, base: Math.round(base) }
      if (reinvestPct > 0) point.reinvest = Math.round(reinv)
      data.push(point)
      base = base * (1 + scenario.postCrisisReturn) + annualSavings
      reinv = reinv * (1 + scenario.postCrisisReturn) + annualSavings
    }
    return data
  }, [recoveryStart, recoveryStartReinvest, scenario.postCrisisReturn, annualSavings, recoveryYears, recoveryYearsReinvest, reinvestPct])

  // Recommandation de rééquilibrage
  const recommendation = useMemo(() => {
    if (patrimoineBrutBefore <= 0) return null
    const components = [
      { key: 'mat',  score: matScore  },
      { key: 'loss', score: lossScore },
      { key: 'rec',  score: recScore  },
    ].sort((a, b) => a.score - b.score)
    const weakest = components[0]

    if (weakest.key === 'mat' && monthlyExpenses > 0) {
      const currentLiqPre = (categoryValues.LIVRET ?? 0) + (categoryValues.LIQUIDITE ?? 0)
      const currentMoisPre = currentLiqPre / monthlyExpenses
      if (currentMoisPre >= 6) return null
      const shortage = Math.max(0, 6 * monthlyExpenses - currentLiqPre)
      const source    = ['CRYPTO', 'BOURSE', 'IMMO_PAPIER'].find(c => (categoryValues[c] ?? 0) >= 1000)
      if (!source) return null
      const transfer  = Math.min(shortage, categoryValues[source] ?? 0)
      if (transfer < 500) return null

      const newCatVals = { ...categoryValues, [source]: (categoryValues[source] ?? 0) - transfer, LIVRET: (categoryValues.LIVRET ?? 0) + transfer }
      const newBrutAfter = CATEGORY_ORDER.reduce((s, cat) => {
        const dd = scenario.drawdowns[cat] ?? 0
        return s + (newCatVals[cat] ?? 0) * (1 + dd)
      }, 0)
      const newLiqAfter     = (newCatVals.LIVRET ?? 0) * (1 + (scenario.drawdowns.LIVRET ?? 0))
                            + (newCatVals.LIQUIDITE ?? 0) * (1 + (scenario.drawdowns.LIQUIDITE ?? 0))
      const newMoisCouverts = newLiqAfter / monthlyExpenses
      const newLossPct      = (newBrutAfter - patrimoineBrutBefore) / patrimoineBrutBefore
      const newLossScore    = Math.max(0, 10 * (1 - Math.abs(newLossPct) / 0.5))
      const newMatScore     = Math.min(10, newMoisCouverts * 10 / 6)
      const newScore        = Math.round(newLossScore * 0.4 + newMatScore * 0.3 + recScore * 0.3)
      return { type: 'mat', transfer, source, sourceName: CATEGORY_LABELS[source], newMoisCouverts, newScore, scoreDiff: newScore - resilienceScore }
    }

    if (weakest.key === 'loss') {
      const source = ['CRYPTO', 'BOURSE'].find(c => (categoryValues[c] ?? 0) >= 5000 && Math.abs(scenario.drawdowns[c] ?? 0) > 0.1)
      if (!source) return null
      const transfer = Math.min((categoryValues[source] ?? 0) * 0.2, 100000)
      if (transfer < 1000) return null

      const newCatVals   = { ...categoryValues, [source]: (categoryValues[source] ?? 0) - transfer, LIVRET: (categoryValues.LIVRET ?? 0) + transfer }
      const newBrutAfter = CATEGORY_ORDER.reduce((s, cat) => s + (newCatVals[cat] ?? 0) * (1 + (scenario.drawdowns[cat] ?? 0)), 0)
      const newLiqAfter  = (newCatVals.LIVRET ?? 0) * (1 + (scenario.drawdowns.LIVRET ?? 0))
                         + (newCatVals.LIQUIDITE ?? 0) * (1 + (scenario.drawdowns.LIQUIDITE ?? 0))
      const newLossPct   = (newBrutAfter - patrimoineBrutBefore) / patrimoineBrutBefore
      const newLossScore = Math.max(0, 10 * (1 - Math.abs(newLossPct) / 0.5))
      const newMatScore  = monthlyExpenses > 0 ? Math.min(10, (newLiqAfter / monthlyExpenses) * 10 / 6) : matScore
      const newScore     = Math.round(newLossScore * 0.4 + newMatScore * 0.3 + recScore * 0.3)
      return { type: 'loss', transfer, source, sourceName: CATEGORY_LABELS[source], newLossPct, newScore, scoreDiff: newScore - resilienceScore }
    }

    if (weakest.key === 'rec' && recoveryYears != null && recoveryYears > 2) {
      const savingsBoost      = Math.max(200, monthlyExpenses * 0.1)
      const newAnnualSavings  = annualSavings + savingsBoost * 12
      const newRecoveryYears  = computeRecoveryYears(recoveryStart, patrimoineBrutBefore, scenario.postCrisisReturn, newAnnualSavings)
      if (newRecoveryYears === null || newRecoveryYears >= (recoveryYears ?? 50)) return null
      const savedYears  = recoveryYears - newRecoveryYears
      if (savedYears <= 0) return null
      const newRecScore = Math.max(0, 10 * (1 - newRecoveryYears / 15))
      const newScore    = Math.round(lossScore * 0.4 + matScore * 0.3 + newRecScore * 0.3)
      return { type: 'rec', savingsBoost, savedYears, newRecoveryYears, newScore, scoreDiff: newScore - resilienceScore }
    }

    return null
  }, [categoryValues, monthlyExpenses, scenario, patrimoineBrutBefore, lossScore, matScore, recScore,
      resilienceScore, annualSavings, recoveryStart, recoveryYears])

  const activeCats = CATEGORY_ORDER.filter(cat => (categoryValues[cat] ?? 0) > 0)

  if (loading) return <p className="text-gray-500 text-sm">Chargement…</p>
  if (error)   return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>

  if (patrimoineBrutBefore === 0) return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Simulation de crise</h1>
      <p className="text-sm text-gray-500">Aucune position active enregistrée. Ajoutez des actifs dans la page Patrimoine pour utiliser cet outil.</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simulation de crise</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualisez l'impact qu'une crise financière historique aurait sur votre patrimoine actuel.
        </p>
      </div>

      {/* Sélecteur de scénario */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Scénario de crise</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIO_ORDER.map(id => (
            <button key={id} onClick={() => setScenarioId(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                scenarioId === id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {SCENARIOS[id].label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-5">{scenario.description}</p>

        {scenarioId === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-5 p-4 bg-gray-50 rounded-lg">
            {CATEGORY_ORDER.map(cat => (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-600">{CATEGORY_LABELS[cat]}</span>
                  <span className={`text-xs font-bold ${customPcts[cat] < 0 ? 'text-red-600' : customPcts[cat] > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {customPcts[cat] > 0 ? '+' : ''}{customPcts[cat]} %
                  </span>
                </div>
                <input type="range" min="-100" max="0" step="1" value={customPcts[cat]}
                  onChange={e => setCustomPcts(d => ({ ...d, [cat]: parseInt(e.target.value) }))}
                  className="w-full accent-indigo-600"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={jobLoss} onChange={e => setJobLoss(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm text-gray-700">
              Inclure une perte d'emploi
              <span className="text-gray-400 ml-1">(matelas érodé · épargne = 0)</span>
            </span>
          </label>
          {jobLoss && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Durée :</label>
              <input type="number" min="1" max="60" step="1" value={jobLossMonths}
                onChange={e => setJobLossMonths(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-sm text-gray-500">mois sans revenu</span>
            </div>
          )}
        </div>
      </div>

      {/* Synthèse avant / après */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Patrimoine brut', before: patrimoineBrutBefore, after: patrimoineBrutAfter },
          { label: 'Patrimoine net',  before: patrimoineNetBefore,  after: patrimoineNetAfter  },
        ].map(({ label, before, after }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
            <p className="text-lg font-bold text-gray-900 amount">{fmtEur(before)}</p>
            <p className="text-xs text-gray-400 mb-3">avant crise</p>
            <div className="border-t border-gray-100 pt-3">
              <p className={`text-lg font-bold amount ${after < before ? 'text-red-600' : 'text-gray-900'}`}>{fmtEur(after)}</p>
              <p className="text-xs text-gray-400">après crise</p>
            </div>
          </div>
        ))}
        <div className="bg-red-50 border border-red-100 rounded-xl shadow-sm p-5">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">Perte potentielle</p>
          <p className={`text-2xl font-bold amount ${totalLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmtEur(jobLoss ? patrimoineBrutApresChomage - patrimoineBrutBefore : totalLoss)}
          </p>
          <p className={`text-base font-semibold mt-1 amount ${totalLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {fmtPct(patrimoineBrutBefore > 0 ? (jobLoss ? patrimoineBrutApresChomage - patrimoineBrutBefore : totalLoss) / patrimoineBrutBefore : 0)}
          </p>
          {jobLoss && erosionMatelas > 0 && (
            <p className="text-xs text-amber-600 mt-2">dont <span className="amount">{fmtEur(erosionMatelas)}</span> de matelas</p>
          )}
        </div>
      </div>

      {/* Score de résilience */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Score de résilience</h2>
        <div className="flex flex-wrap items-center gap-6">
          <ResilienceScore score={resilienceScore} />
          <div className="flex flex-col gap-3 flex-1 min-w-[200px]">
            {[
              { label: 'Perte patrimoniale',    score: Math.round(lossScore), detail: `${Math.round(Math.abs(totalLossPct) * 100)} % de perte`,                                                              weight: '40 %' },
              { label: 'Couverture du matelas', score: Math.round(matScore),  detail: moisCouverts != null ? `${moisCouverts.toFixed(1)} mois` : 'non calculé',                                              weight: '30 %' },
              { label: 'Temps de récupération', score: Math.round(recScore),  detail: recoveryYears === null ? '> 50 ans' : recoveryYears === 0 ? 'aucune perte' : `${recoveryYears} an${recoveryYears > 1 ? 's' : ''}`, weight: '30 %' },
            ].map(({ label, score: s, detail, weight }) => {
              const color = s >= 7 ? 'bg-emerald-400' : s >= 4 ? 'bg-amber-400' : 'bg-red-400'
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{detail}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs font-semibold text-gray-500">{s}/10</span>
                      <span className="text-xs text-gray-300">({weight})</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${s * 10}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommandation de rééquilibrage */}
        {recommendation && recommendation.scoreDiff > 0 && (
          <div className="mt-5 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Recommandation de rééquilibrage</p>
            {recommendation.type === 'mat' && (
              <p className="text-sm text-gray-700">
                Transférer <span className="font-semibold text-indigo-700 amount">{fmtEur(recommendation.transfer)}</span> de {recommendation.sourceName} vers Livrets
                porterait votre couverture matelas à <span className="font-semibold">{recommendation.newMoisCouverts.toFixed(1)} mois</span> et votre score à{' '}
                <span className="font-semibold text-indigo-700">{recommendation.newScore}/10</span>
                {' '}(+{recommendation.scoreDiff} point{recommendation.scoreDiff > 1 ? 's' : ''}).
              </p>
            )}
            {recommendation.type === 'loss' && (
              <p className="text-sm text-gray-700">
                Réduire votre exposition {recommendation.sourceName} de <span className="font-semibold text-indigo-700 amount">{fmtEur(recommendation.transfer)}</span> (20 %)
                en faveur des Livrets limiterait la perte à{' '}
                <span className="font-semibold">{Math.round(Math.abs(recommendation.newLossPct) * 100)} %</span> et porterait votre score à{' '}
                <span className="font-semibold text-indigo-700">{recommendation.newScore}/10</span>
                {' '}(+{recommendation.scoreDiff} point{recommendation.scoreDiff > 1 ? 's' : ''}).
              </p>
            )}
            {recommendation.type === 'rec' && (
              <p className="text-sm text-gray-700">
                Augmenter votre épargne mensuelle de <span className="font-semibold text-indigo-700 amount">{fmtEur(recommendation.savingsBoost)}</span> réduirait
                la récupération de <span className="font-semibold">{recommendation.savedYears} an{recommendation.savedYears > 1 ? 's' : ''}</span>
                {' '}(à {recommendation.newRecoveryYears} ans) et porterait votre score à{' '}
                <span className="font-semibold text-indigo-700">{recommendation.newScore}/10</span>
                {' '}(+{recommendation.scoreDiff} point{recommendation.scoreDiff > 1 ? 's' : ''}).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Détail par catégorie */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Impact par catégorie</h2>
        <div className="flex flex-col gap-5">
          {activeCats.map(cat => {
            const { before, after, drawdown } = categoryImpact[cat]
            const barPct   = before > 0 ? Math.max(0, after / before) * 100 : 100
            const isDown   = drawdown < 0
            const isUp     = drawdown > 0
            const barColor = isDown ? 'bg-red-400' : isUp ? 'bg-emerald-400' : 'bg-gray-300'
            const badgeCls = isDown ? 'bg-red-100 text-red-700' : isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[cat]}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 amount">{fmtEur(before)}</span>
                    <span className="text-gray-300">→</span>
                    <span className={`font-semibold amount ${isDown ? 'text-red-600' : isUp ? 'text-emerald-600' : 'text-gray-700'}`}>{fmtEur(after)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{fmtPct(drawdown)}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Matelas de sécurité */}
      {monthlyExpenses > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Matelas de sécurité après crise</h2>

          {jobLoss && erosionMatelas > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="text-amber-600 font-medium">− <span className="amount">{fmtEur(erosionMatelas)}</span> consommés pendant {jobLossMonths} mois de chômage</span>
              <span className="text-amber-400 amount">({fmtEur(liquiditesAfter)} → {fmtEur(liquiditesApresChomage)})</span>
            </div>
          )}
          {jobLoss && erosionMatelas === 0 && liquiditesAfter > 0 && totalJobLossExpenses > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium">
              Matelas épuisé — {jobLossMonths} mois de dépenses (<span className="amount">{fmtEur(totalJobLossExpenses)}</span>) dépassent le matelas disponible (<span className="amount">{fmtEur(liquiditesAfter)}</span>)
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6 mb-5">
            <div>
              <p className={`text-2xl font-bold amount ${jobLoss && liquiditesApresChomage < liquiditesAfter ? 'text-amber-600' : 'text-gray-900'}`}>
                {fmtEur(liquiditesAffichees)}
              </p>
              <p className="text-sm text-gray-500">LIVRET + LIQUIDITE{jobLoss ? ' après chômage' : ' après crise'}</p>
            </div>
            {moisCouverts != null && (
              <div className="border-l border-gray-200 pl-6">
                <p className={`text-2xl font-bold ${moisCouverts >= 3 ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {moisCouverts.toFixed(1)} mois
                </p>
                <p className="text-sm text-gray-500">de dépenses couvertes</p>
              </div>
            )}
            {snTarget != null && (
              <div className="border-l border-gray-200 pl-6">
                <p className={`text-sm font-semibold ${liquiditesAffichees >= snTarget ? 'text-emerald-600' : 'text-red-600'}`}>
                  {liquiditesAffichees >= snTarget ? '✓ Objectif atteint' : '✗ Objectif non atteint'}
                </p>
                <p className="text-sm text-gray-400">Cible matelas : <span className="amount">{fmtEur(snTarget)}</span></p>
              </div>
            )}
          </div>

          {jobLoss && depletionSteps.length > 1 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Épuisement du matelas mois par mois</p>
              <div className="flex flex-col gap-1.5">
                {depletionSteps.map(({ month, value }) => {
                  const pct    = liquiditesAfter > 0 ? (value / liquiditesAfter) * 100 : 0
                  const barCls = pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400'
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-14 text-right shrink-0">{month === 0 ? 'J+0' : `M+${month}`}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${barCls}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-medium w-20 text-right shrink-0 amount ${value === 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        {value === 0 ? 'Épuisé' : fmtEur(value)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Réallocation post-crise */}
      {canReinvest && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Réallocation post-crise</h2>
          <p className="text-sm text-gray-500 mb-5">
            Simulez le rachat au creux — réinjecter une partie de votre matelas en Bourse au moment de la chute accélère la récupération.
          </p>
          <div className="flex items-center gap-4 mb-5">
            <label className="text-sm text-gray-600 shrink-0">Réinvestir en Bourse :</label>
            <input type="range" min="0" max="100" step="5" value={reinvestPct}
              onChange={e => setReinvestPct(parseInt(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-sm font-bold text-indigo-600 w-10 text-right shrink-0">{reinvestPct} %</span>
          </div>
          {reinvestPct > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Montant réinvesti</p>
                <p className="text-lg font-bold text-indigo-600 amount">{fmtEur(reinvestAmount)}</p>
                <p className="text-xs text-gray-400 mt-1">à {Math.round(Math.abs(bourseDrawdown) * 100)} % sous le prix d'avant-crise</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Plus-value latente au creux</p>
                <p className="text-lg font-bold text-emerald-600 amount">+ {fmtEur(reinvestBonus)}</p>
                <p className="text-xs text-gray-400 mt-1">gain théorique si retour au niveau pré-crise</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-500 mb-1">Récupération avec réallocation</p>
                <p className="text-lg font-bold text-indigo-700">
                  {recoveryYearsReinvest === 0 ? 'Immédiat' : recoveryYearsReinvest === null ? '> 50 ans' : `${recoveryYearsReinvest} an${recoveryYearsReinvest > 1 ? 's' : ''}`}
                </p>
                {recoverySaved != null && recoverySaved > 0 && (
                  <p className="text-xs text-indigo-500 mt-1">− {recoverySaved} an{recoverySaved > 1 ? 's' : ''} vs sans réallocation</p>
                )}
                {recoverySaved === 0 && <p className="text-xs text-gray-400 mt-1">même durée qu'avant</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Déplacez le curseur pour simuler un réinvestissement de votre matelas au creux de la crise.</p>
          )}
        </div>
      )}

      {/* Récupération + Courbe */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Estimation de récupération</h2>

        {recoveryYears === 0 ? (
          <p className="text-emerald-600 font-semibold text-sm">Aucune perte — aucune récupération nécessaire.</p>
        ) : recoveryYears === null ? (
          <p className="text-red-600 font-semibold text-sm">
            Récupération estimée à plus de 50 ans dans ces conditions.
            {jobLoss && ' Désactivez la perte d\'emploi pour voir l\'impact de l\'épargne.'}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-4xl font-bold text-gray-900">{recoveryYears}</span>
              <span className="text-lg text-gray-500">an{recoveryYears > 1 ? 's' : ''} estimé{recoveryYears > 1 ? 's' : ''}</span>
              {scenario.recoveryRef && (
                <span className="text-sm text-gray-400 ml-2">· référence historique : {scenario.recoveryRef}</span>
              )}
              {reinvestPct > 0 && recoverySaved != null && recoverySaved > 0 && (
                <span className="text-sm text-emerald-600 ml-2 font-medium">· {recoveryYearsReinvest} ans avec réallocation</span>
              )}
            </div>

            {/* Courbe de récupération */}
            {chartData.length > 1 && (
              <div className="mb-2">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false}
                      label={{ value: 'Années', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis tickFormatter={fmtEurShort} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} width={56} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={patrimoineBrutBefore} stroke="#6b7280" strokeDasharray="4 4"
                      label={{ value: 'Avant crise', position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                    />
                    {fireTarget && fireTarget > recoveryStart && (
                      <ReferenceLine y={fireTarget} stroke="#7c3aed" strokeDasharray="4 4"
                        label={{ value: 'FIRE', position: 'insideTopRight', fontSize: 10, fill: '#7c3aed' }}
                      />
                    )}
                    <Line type="monotone" dataKey="base" name="Patrimoine" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    {reinvestPct > 0 && (
                      <Line type="monotone" dataKey="reinvest" name="Avec réallocation" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Basé sur un rendement historique post-crise de {Math.round(scenario.postCrisisReturn * 100)} % / an
          {!jobLoss && annualSavings > 0 && <> + une épargne de <span className="amount">{fmtEur(annualSavings / 12)}</span> / mois</>}
          {!jobLoss && annualSavings <= 0 && ' (épargne nulle ou négative)'}
          {jobLoss && <> · sans épargne · matelas érodé de <span className="amount">{fmtEur(erosionMatelas)}</span> sur {jobLossMonths} mois de chômage</>}
          .
        </p>
      </div>

      {/* Impact FIRE */}
      {showFireSection && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Impact sur votre projection FIRE</h2>
          <p className="text-sm text-gray-500 mb-5">
            La crise retarde-t-elle votre indépendance financière ? Calculé avec un rendement long terme de {Math.round(LONG_TERM_RETURN * 100)} % / an.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Objectif FIRE</p>
              <p className="text-lg font-bold text-gray-800 amount">{fmtEur(fireTarget)}</p>
              <p className="text-xs text-gray-400 mt-1">25 × dépenses annuelles (règle des 4 %)</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Sans crise</p>
              <p className="text-lg font-bold text-emerald-700">
                {yearsToFireBefore === 0 ? 'Déjà FIRE' : yearsToFireBefore === null ? '> 50 ans' : `${yearsToFireBefore} an${yearsToFireBefore > 1 ? 's' : ''}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">à partir d'aujourd'hui</p>
            </div>
            <div className={`p-4 rounded-lg ${fireDelay != null && fireDelay > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className={`text-xs mb-1 ${fireDelay != null && fireDelay > 0 ? 'text-red-500' : 'text-emerald-600'}`}>Après la crise</p>
              <p className={`text-lg font-bold ${fireDelay != null && fireDelay > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {yearsToFireAfter === 0 ? 'Déjà FIRE' : yearsToFireAfter === null ? '> 50 ans' : `${yearsToFireAfter} an${yearsToFireAfter > 1 ? 's' : ''}`}
              </p>
              {fireDelay != null && fireDelay > 0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">+ {fireDelay} an{fireDelay > 1 ? 's' : ''} de retard</p>
              )}
              {fireDelay === 0 && <p className="text-xs text-emerald-600 mt-1">aucun impact</p>}
              {yearsToFireBefore === 0 && yearsToFireAfter !== null && yearsToFireAfter > 0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">vous n'êtes plus FIRE</p>
              )}
            </div>
          </div>

          {/* Barre de progression FIRE */}
          {fireTarget && patrimoineBrutBefore > 0 && (
            <div className="space-y-2">
              {[
                { label: 'Avant crise',  value: patrimoineBrutBefore, color: 'bg-emerald-400' },
                { label: 'Après crise',  value: recoveryStart,        color: 'bg-red-400'     },
              ].map(({ label, value, color }) => {
                const pct = Math.min(100, (value / fireTarget) * 100)
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right shrink-0">{Math.round(pct)} %</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Méthodologie score de résilience */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Méthodologie — Score de résilience</p>
        <p className="text-xs text-gray-500 mb-3">
          Le score de résilience (0–10) mesure la capacité de votre patrimoine à absorber la crise simulée.
          Il est calculé comme la moyenne pondérée de trois composantes :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          {[
            { title: 'Perte patrimoniale (40 %)',    formula: '10 × (1 − |perte| / 50 %)',          desc: '10 si aucune perte, 0 si ≥ 50 % du patrimoine brut est perdu. Linéaire entre les deux.' },
            { title: 'Couverture du matelas (30 %)', formula: 'min(10 ; mois couverts × 10 / 6)',   desc: '10 si le matelas couvre ≥ 6 mois de dépenses, 0 si le matelas est vide. Capé à 10.' },
            { title: 'Temps de récupération (30 %)', formula: '10 × (1 − années / 15)',             desc: '10 si la récupération est immédiate, 0 si elle dépasse 15 ans. Vaut 0 au-delà de 50 ans.' },
          ].map(({ title, formula, desc }) => (
            <div key={title} className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-1">{title}</p>
              <code className="text-xs text-indigo-600 block mb-1">{formula}</code>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 italic">
          Les seuils (50 % de perte max, 6 mois de matelas, 15 ans de récupération) sont des références indicatives.
          Le score varie dynamiquement selon le scénario sélectionné et les paramètres de perte d'emploi.
        </p>
      </div>

      {/* Avertissement */}
      <p className="text-xs text-gray-400 italic text-center pb-4">
        Les taux utilisés sont des approximations basées sur des données historiques.
        Les performances passées ne préjugent pas des performances futures.
        Cet outil est fourni à titre indicatif uniquement.
      </p>
    </div>
  )
}
