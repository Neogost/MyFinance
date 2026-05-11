import { useEffect, useState, useMemo } from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

const CURRENT_YEAR = new Date().getFullYear()

function fmt(amount) {
  if (amount == null || isNaN(amount)) return '—'
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

function fmtPct(val) {
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'
}

function NumInput({ label, value, onChange, min, max, step = 1, hint, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, children, collapsible = false, defaultOpen = true, accent = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const base = accent
    ? 'bg-indigo-50 rounded-xl border border-indigo-100 p-5'
    : 'bg-white rounded-xl shadow-sm border border-gray-100 p-5'
  const titleClass = accent
    ? 'text-sm font-semibold text-indigo-700 uppercase tracking-wide'
    : 'text-sm font-semibold text-gray-500 uppercase tracking-wide'
  return (
    <div className={base}>
      {collapsible ? (
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center justify-between w-full ${titleClass}`}
        >
          {title}
          <span className={accent ? 'text-indigo-400' : 'text-gray-400'}>{open ? '▲' : '▼'}</span>
        </button>
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}
      {(!collapsible || open) && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  )
}

function FrequencyToggle({ value, onChange }) {
  return (
    <div className="flex border border-gray-300 rounded-md overflow-hidden text-sm w-full">
      <button
        onClick={() => onChange('monthly')}
        className={`flex-1 py-1.5 transition ${value === 'monthly' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
      >Mensuel</button>
      <button
        onClick={() => onChange('annual')}
        className={`flex-1 py-1.5 transition ${value === 'annual' ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
      >Annuel</button>
    </div>
  )
}

// ── Calcul principal ──────────────────────────────────────────────────────────

function buildChartData({ initialAmount, realRate, duration, contributionAmount, contributionFrequency, contributionGrowthRate, applyPFU, lumpSums = [] }) {
  const effectiveRate = applyPFU ? realRate * 0.686 : realRate
  const r  = effectiveRate / 100
  const rm = r / 12

  let capital      = initialAmount
  let totalInvested = initialAmount
  let currentContrib = contributionAmount

  const data = [{
    year: 0, label: CURRENT_YEAR,
    investi: Math.round(initialAmount),
    interets: 0,
    total: Math.round(initialAmount),
    versement: Math.round(currentContrib),
    yearIntFromCapital: 0,
    yearIntFromContrib: 0,
  }]

  for (let t = 1; t <= duration; t++) {
    let yearIntCapital, yearIntContrib, annualContrib

    if (contributionFrequency === 'monthly') {
      annualContrib  = currentContrib * 12
      yearIntCapital = capital * r
      const fvc      = rm === 0 ? annualContrib : currentContrib * (Math.pow(1 + rm, 12) - 1) / rm
      yearIntContrib = fvc - annualContrib
      capital        = capital * (1 + r) + fvc
    } else {
      annualContrib  = currentContrib
      yearIntCapital = capital * r
      yearIntContrib = currentContrib * r
      capital        = (capital + currentContrib) * (1 + r)
    }

    totalInvested += annualContrib
    const versementThisYear = currentContrib
    currentContrib *= (1 + contributionGrowthRate / 100)

    // Apport ponctuel ajouté après la croissance (step-up visible sur le graphique)
    const ls = lumpSums.find(l => l.year === CURRENT_YEAR + t)
    if (ls && ls.amount > 0) {
      capital       += ls.amount
      totalInvested += ls.amount
    }

    data.push({
      year: t, label: CURRENT_YEAR + t,
      investi:  Math.round(totalInvested),
      interets: Math.round(Math.max(0, capital - totalInvested)),
      total:    Math.round(capital),
      versement: Math.round(versementThisYear),
      yearIntFromCapital: Math.round(yearIntCapital),
      yearIntFromContrib: Math.round(yearIntContrib),
      lumpSum: ls?.amount ?? 0,
    })
  }
  return data
}

function getFinalCapital(params) {
  const data = buildChartData(params)
  return data[data.length - 1].total
}

function bisect(fn, low, high, target) {
  for (let i = 0; i < 70; i++) {
    const mid = (low + high) / 2
    if (fn(mid) < target) low = mid
    else high = mid
  }
  return (low + high) / 2
}

function buildDecumulationData({ capital, annualWithdrawal, effectiveRate, startYear }) {
  const data = []
  const r = effectiveRate / 100

  for (let t = 0; t <= 60; t++) {
    data.push({
      year: t,
      label: startYear + t,
      capital: Math.round(Math.max(0, capital)),
    })
    if (capital <= 0) break
    capital = capital * (1 + r) - annualWithdrawal
  }
  return data
}

// ── Tooltip ───────────────────────────────────────────────────────────────────


function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const investi  = payload.find(p => p.dataKey === 'investi')?.value  ?? 0
  const interets = payload.find(p => p.dataKey === 'interets')?.value ?? 0
  const pess     = payload.find(p => p.dataKey === 'pessTotal')?.value
  const opti     = payload.find(p => p.dataKey === 'optiTotal')?.value
  const n = label - CURRENT_YEAR
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-gray-700">{label}</p>
      {n > 0 && <p className="text-xs text-gray-400 mb-1">dans {n} an{n > 1 ? 's' : ''}</p>}
      <p className="text-indigo-600">Investi : {fmt(investi)}</p>
      <p style={{ color: '#f97316' }}>Intérêts : {fmt(interets)}</p>
      <p className="font-semibold text-gray-900 mt-1 border-t border-gray-100 pt-1">Total : {fmt(investi + interets)}</p>
      {pess != null && <p className="text-red-400 text-xs mt-1">Pessimiste : {fmt(pess)}</p>}
      {opti != null && <p className="text-green-500 text-xs">Optimiste : {fmt(opti)}</p>}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function CompoundInterestSimulatorPage() {
  const { trackPageView } = useAnalytics()
  useEffect(() => { trackPageView('tools.compound_interest') }, [])
  // Base
  const [initialAmount, setInitialAmount]     = useState(10000)
  const [annualRate, setAnnualRate]           = useState(7)
  const [durationMode, setDurationMode]       = useState('years') // 'years' | 'targetYear'
  const [duration, setDuration]               = useState(20)
  const [targetYear, setTargetYear]           = useState(CURRENT_YEAR + 20)

  // Versements
  const [contribution, setContribution]               = useState(200)
  const [frequency, setFrequency]                     = useState('monthly')
  const [contributionGrowth, setContributionGrowth]   = useState(0)

  // Scénarios
  const [showScenarios, setShowScenarios]     = useState(false)
  const [pessimisticRate, setPessimisticRate] = useState(4)
  const [optimisticRate, setOptimisticRate]   = useState(10)

  // Options avancées
  const [inflationRate, setInflationRate]     = useState(2)
  const [managementFees, setManagementFees]   = useState(0)
  const [applyPFU, setApplyPFU]               = useState(false)
  const [withdrawalRate, setWithdrawalRate]   = useState(4)

  // Mode
  const [mode, setMode]                       = useState('standard')
  const [inverseVariant, setInverseVariant]   = useState('contribution')
  const [targetAmount, setTargetAmount]       = useState(500000)
  const [desiredMonthly, setDesiredMonthly]   = useState(2000)

  // Apports ponctuels
  const [lumpSums, setLumpSums] = useState([]) // [{ id, year, amount }]

  // UI
  const [showTable, setShowTable]             = useState(false)
  const [interetTooltip, setInteretTooltip]   = useState(null) // { x, y, row }

  const effectiveDuration = durationMode === 'targetYear'
    ? Math.max(1, targetYear - CURRENT_YEAR)
    : duration

  const realRate = annualRate - inflationRate - managementFees

  const hideVersements = mode === 'inverse' && (inverseVariant === 'contribution' || inverseVariant === 'monthlyIncome')

  const { chartData, finalCapital, totalInvested, totalInterest,
          annualWithdrawal, monthlyWithdrawal, inverseResult, resolvedDuration,
          decumulationData, isSustainable, depletionIndex, crossoverIndex } =
    useMemo(() => {
      const base = {
        initialAmount,
        contributionAmount: contribution,
        contributionFrequency: frequency,
        contributionGrowthRate: contributionGrowth,
        applyPFU,
        lumpSums,
      }

      let usedRealRate   = realRate
      let usedContrib    = contribution
      let usedDuration   = effectiveDuration
      let inverseResult  = null

      if (mode === 'inverse') {
        const targetCapital = inverseVariant === 'monthlyIncome' && withdrawalRate > 0
          ? desiredMonthly * 12 / (withdrawalRate / 100)
          : targetAmount

        if (inverseVariant === 'contribution' || inverseVariant === 'monthlyIncome') {
          usedContrib = bisect(
            c => getFinalCapital({ ...base, realRate, duration: effectiveDuration, contributionAmount: c }),
            0, 200000, targetCapital
          )
          inverseResult = {
            label: inverseVariant === 'monthlyIncome'
              ? `Versement requis pour ${fmt(desiredMonthly)}/mois`
              : 'Versement requis',
            value: usedContrib,
            unit: frequency === 'monthly' ? '/mois' : '/an',
          }
        } else if (inverseVariant === 'duration') {
          usedDuration = Math.ceil(
            bisect(
              d => getFinalCapital({ ...base, realRate, duration: Math.round(d), contributionAmount: contribution }),
              1, 100, targetCapital
            )
          )
          inverseResult = { label: 'Durée requise', value: usedDuration, unit: 'ans' }
        } else if (inverseVariant === 'rate') {
          const grossRate = bisect(
            rate => getFinalCapital({ ...base, realRate: rate - inflationRate, duration: effectiveDuration, contributionAmount: contribution }),
            0, 50, targetCapital
          )
          usedRealRate  = grossRate - inflationRate
          inverseResult = { label: 'Taux annuel requis', value: grossRate, unit: '%' }
        }
      }

      const mainData = buildChartData({ ...base, realRate: usedRealRate, duration: usedDuration, contributionAmount: usedContrib })

      let mergedData = mainData
      if (showScenarios) {
        const pessData = buildChartData({ ...base, realRate: pessimisticRate - inflationRate, duration: usedDuration, contributionAmount: usedContrib })
        const optiData = buildChartData({ ...base, realRate: optimisticRate  - inflationRate, duration: usedDuration, contributionAmount: usedContrib })
        mergedData = mainData.map((d, i) => ({ ...d, pessTotal: pessData[i].total, optiTotal: optiData[i].total }))
      }

      const last = mainData[mainData.length - 1]
      const aw   = withdrawalRate > 0 ? last.total * withdrawalRate / 100 : 0
      const effectiveRateForDecum = applyPFU ? usedRealRate * 0.70 : usedRealRate
      const isSustainable = withdrawalRate > 0 && effectiveRateForDecum >= withdrawalRate
      const decumulationData = withdrawalRate > 0
        ? buildDecumulationData({
            capital: last.total,
            annualWithdrawal: aw,
            effectiveRate: effectiveRateForDecum,
            startYear: CURRENT_YEAR + usedDuration,
          })
        : []
      const depletionIndex = decumulationData.findIndex(d => d.capital <= 0)

      return {
        chartData:       mergedData,
        finalCapital:    last.total,
        totalInvested:   last.investi,
        totalInterest:   last.interets,
        annualWithdrawal:  aw,
        monthlyWithdrawal: aw / 12,
        inverseResult,
        resolvedDuration: usedDuration,
        decumulationData,
        isSustainable,
        depletionIndex,
        crossoverIndex: mainData.findIndex(d => d.interets >= d.investi),
      }
    }, [initialAmount, annualRate, realRate, effectiveDuration, contribution, frequency, contributionGrowth,
        inflationRate, managementFees, applyPFU, withdrawalRate, mode, inverseVariant, targetAmount, desiredMonthly,
        showScenarios, pessimisticRate, optimisticRate, lumpSums])

  const footnotes = useMemo(() => {
    const notes = []
    if (frequency === 'monthly') {
      notes.push('Les versements mensuels sont capitalisés individuellement : chaque versement produit des intérêts pour les mois restants de l\'année (formule d\'annuité de fin de période). Le premier versement de l\'année capitalise 11 mois, le dernier 0 mois.')
    } else {
      notes.push('Les versements annuels sont ajoutés en début d\'année puis capitalisés sur l\'année entière.')
    }
    if (managementFees > 0) {
      notes.push(`Les frais de gestion (${fmtPct(managementFees)}/an) sont déduits du taux nominal avant tout autre calcul. Sur ${resolvedDuration} ans, ${fmtPct(managementFees)} de frais représente environ ${fmtPct(Math.pow(1 + managementFees / 100, resolvedDuration) - 1)} de capital en moins par rapport à un placement sans frais.`)
    }
    if (inflationRate > 0) {
      notes.push(`Le taux d'inflation (${fmtPct(inflationRate)}) est déduit du taux nominal pour obtenir le taux réel (${fmtPct(realRate)}). Les montants affichés sont exprimés en euros constants d'aujourd'hui.`)
    }
    if (applyPFU) {
      notes.push('La flat tax PFU 31,4 % est simulée en réduisant le rendement effectif à 70 % du taux nominal (simplification — en réalité la fiscalité s\'applique à la cession pour un PEA ou annuellement sur les coupons pour un CTO).')
    }
    if (contributionGrowth > 0) {
      notes.push(`Les versements augmentent de ${fmtPct(contributionGrowth)} par an (effet de palier). Le versement de la dernière année est indiqué dans le tableau détaillé.`)
    }
    if (mode === 'inverse') {
      const variantLabels = { contribution: 'versement', duration: 'durée', rate: 'taux', monthlyIncome: 'versement' }
      notes.push(`Le ${variantLabels[inverseVariant] ?? 'paramètre'} requis est calculé par dichotomie numérique (convergence en 70 itérations, précision < 0,01 €).`)
    }
    if (showScenarios) {
      notes.push(`Les courbes pessimiste (${pessimisticRate}%) et optimiste (${optimisticRate}%) utilisent les mêmes versements et paramètres, seul le taux d'intérêt change.`)
    }
    if (withdrawalRate > 0) {
      notes.push(`La phase de décaissement suppose un retrait annuel fixe de ${fmtPct(withdrawalRate)} du capital final, avec le capital restant investi au même taux effectif. La durée de vie du capital est théoriquement infinie si le taux de rendement est supérieur ou égal au taux de retrait.`)
    }
    return notes
  }, [frequency, managementFees, inflationRate, realRate, applyPFU, contributionGrowth, mode, inverseVariant,
      showScenarios, pessimisticRate, optimisticRate, withdrawalRate, resolvedDuration])

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Simulateur d'Intérêts Composés
        <sup className="text-sm font-normal text-gray-400 ml-1">*</sup>
      </h1>

      {/* Toggle mode */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { v: 'standard', label: 'Projection directe', labelMobile: 'Projection' },
          { v: 'inverse',  label: 'Mode inversé — objectif de patrimoine', labelMobile: 'Mode inversé' },
        ].map(({ v, label, labelMobile }) => (
          <button
            key={v}
            onClick={() => setMode(v)}
            data-testid={`compound-mode-${v}`}
            aria-label={label}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === v ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-indigo-400'}`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{labelMobile}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

        {/* ── Panneau gauche ── */}
        <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

          {/* Paramètres de base */}
          <Section title="Paramètres de base">
            <NumInput label="Capital initial (€)" value={initialAmount} onChange={setInitialAmount} min={0} step={500} />
            <NumInput
              label="Taux d'intérêt annuel (%)"
              value={annualRate}
              onChange={setAnnualRate}
              min={0.1} max={30} step={0.1}
              disabled={mode === 'inverse' && inverseVariant === 'rate'}
            />

            {!(mode === 'inverse' && inverseVariant === 'duration') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Horizon</label>
                  <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
                    <button
                      onClick={() => setDurationMode('years')}
                      className={`px-2.5 py-1 transition ${durationMode === 'years' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >Durée</button>
                    <button
                      onClick={() => setDurationMode('targetYear')}
                      className={`px-2.5 py-1 transition ${durationMode === 'targetYear' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >Année cible</button>
                  </div>
                </div>

                {durationMode === 'years' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={1} max={50} value={duration}
                      onChange={e => setDuration(parseInt(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="w-16 text-sm font-semibold text-indigo-700 text-right">{duration} ans</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      value={targetYear}
                      onChange={e => setTargetYear(parseInt(e.target.value) || CURRENT_YEAR + 1)}
                      min={CURRENT_YEAR + 1} max={CURRENT_YEAR + 80}
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <p className="text-xs text-indigo-600 mt-0.5">
                      soit dans {Math.max(1, targetYear - CURRENT_YEAR)} an{Math.max(1, targetYear - CURRENT_YEAR) > 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>
            )}
          </Section>

          {/* Versements */}
          {!hideVersements && (
            <Section title="Versements">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                <input
                  type="number" value={contribution} min={0} step={50}
                  onChange={e => setContribution(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                />
                <FrequencyToggle value={frequency} onChange={setFrequency} />
              </div>
              <NumInput
                label="Hausse annuelle des versements (%)"
                value={contributionGrowth}
                onChange={setContributionGrowth}
                min={0} max={20} step={0.5}
                hint="Ex : +3 %/an pour suivre l'évolution du salaire"
              />
            </Section>
          )}

          {/* Mode inversé */}
          {mode === 'inverse' && (
            <Section title="Objectif" accent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Je veux calculer…</label>
                <div className="space-y-1.5">
                  {[
                    { v: 'contribution',  label: 'Le versement requis'   },
                    { v: 'duration',      label: 'La durée nécessaire'   },
                    { v: 'rate',          label: 'Le taux requis'         },
                    { v: 'monthlyIncome', label: 'Un revenu mensuel cible' },
                  ].map(({ v, label }) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={v} checked={inverseVariant === v} onChange={() => setInverseVariant(v)} className="accent-indigo-600" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {inverseVariant === 'monthlyIncome' ? (
                <>
                  <NumInput label="Revenu mensuel souhaité (€)" value={desiredMonthly} onChange={setDesiredMonthly} min={0} step={100} />
                  <NumInput
                    label="Taux de retrait (%/an)"
                    value={withdrawalRate}
                    onChange={setWithdrawalRate}
                    min={0.1} max={20} step={0.1}
                    hint={`Capital cible : ${fmt(withdrawalRate > 0 ? desiredMonthly * 12 / (withdrawalRate / 100) : 0)}`}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Versements (€)</label>
                    <input
                      type="number" value={contribution} min={0} step={50}
                      onChange={e => setContribution(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                    />
                    <FrequencyToggle value={frequency} onChange={setFrequency} />
                  </div>
                </>
              ) : (
                <NumInput label="Patrimoine cible (€)" value={targetAmount} onChange={setTargetAmount} min={0} step={10000} />
              )}
            </Section>
          )}

          {/* Apports ponctuels */}
          <Section title="Apports ponctuels" collapsible defaultOpen={false}>
            <p className="text-xs text-gray-400 -mt-2">Héritage, vente d'un bien, prime exceptionnelle…</p>
            {lumpSums.map(ls => (
              <div key={ls.id} className="relative bg-gray-50 rounded-lg p-3 pr-8">
                <button
                  onClick={() => setLumpSums(prev => prev.filter(l => l.id !== ls.id))}
                  className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-100 transition text-xs"
                >✕</button>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Année</label>
                    <select
                      value={ls.year}
                      onChange={e => setLumpSums(prev => prev.map(l => l.id === ls.id ? { ...l, year: parseInt(e.target.value) } : l))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      {Array.from({ length: effectiveDuration }, (_, i) => CURRENT_YEAR + 1 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Montant (€)</label>
                    <input
                      type="number"
                      value={ls.amount}
                      onChange={e => setLumpSums(prev => prev.map(l => l.id === ls.id ? { ...l, amount: parseFloat(e.target.value) || 0 } : l))}
                      min={0} step={1000}
                      placeholder="Montant (€)"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => setLumpSums(prev => [...prev, { id: Date.now(), year: CURRENT_YEAR + Math.min(5, effectiveDuration), amount: 10000 }])}
              className="w-full py-1.5 border border-dashed border-indigo-300 rounded-md text-sm text-indigo-500 hover:bg-indigo-50 transition"
            >
              + Ajouter un apport
            </button>
          </Section>

          {/* Scénarios */}
          <Section title="Scénarios" collapsible defaultOpen={false}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={showScenarios}
                onChange={e => setShowScenarios(e.target.checked)}
                className="accent-indigo-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Afficher pessimiste / optimiste</span>
            </label>
            {showScenarios && (
              <>
                <NumInput label="Taux pessimiste (%)" value={pessimisticRate} onChange={setPessimisticRate} min={0} max={30} step={0.5} />
                <NumInput label="Taux optimiste (%)"  value={optimisticRate}  onChange={setOptimisticRate}  min={0} max={30} step={0.5} />
              </>
            )}
          </Section>

          {/* Options avancées */}
          <Section title="Options avancées" collapsible defaultOpen={false}>
            <NumInput
              label="Inflation annuelle (%)"
              value={inflationRate}
              onChange={setInflationRate}
              min={0} max={20} step={0.1}
              hint="Déduit du taux de rendement"
            />
            <NumInput
              label="Frais de gestion annuels (%)"
              value={managementFees}
              onChange={setManagementFees}
              min={0} max={5} step={0.05}
              hint="Ex : ETF 0,2 % · fonds actifs 1,5–2,5 %"
            />
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={applyPFU}
                  onChange={e => setApplyPFU(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">PFU 31,4 % — flat tax CTO</span>
              </label>
              {applyPFU && <p className="text-xs text-gray-400 pl-6">Rendement net estimé : {fmtPct(realRate * 0.686)}</p>}
            </div>
            {!(mode === 'inverse' && inverseVariant === 'monthlyIncome') && (
              <NumInput
                label="Taux de retrait (%/an)"
                value={withdrawalRate}
                onChange={setWithdrawalRate}
                min={0} max={20} step={0.1}
                hint="% du capital final / an"
              />
            )}
            {realRate < 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                ⚠ Rendement réel négatif ({fmtPct(realRate)}) — l'inflation dépasse le taux d'intérêt.
              </p>
            )}
            <div className="text-xs text-gray-400 bg-gray-50 rounded-md p-2 space-y-0.5">
              <div>Taux nominal : <span className="font-semibold text-gray-600">{fmtPct(annualRate)}</span></div>
              {(inflationRate > 0 || managementFees > 0) && (
                <div>
                  − inflation {fmtPct(inflationRate)}
                  {managementFees > 0 && ` − frais ${fmtPct(managementFees)}`}
                  {applyPFU && ' × 68,6 % (PFU)'}
                </div>
              )}
              <div className="font-semibold text-gray-600 border-t border-gray-200 pt-0.5 mt-0.5">
                Taux effectif : {fmtPct(applyPFU ? realRate * 0.686 : realRate)}
              </div>
            </div>
          </Section>
        </div>

        {/* ── Panneau droit ── */}
        <div className="flex-1 space-y-4">

          {/* Bannière résultat mode inversé */}
          {mode === 'inverse' && inverseResult && (
            <div className="bg-indigo-600 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <p className="text-indigo-200 text-sm">{inverseResult.label}</p>
                <p className="text-2xl font-bold">
                  {inverseResult.unit === '%'
                    ? fmtPct(inverseResult.value)
                    : inverseVariant === 'duration'
                      ? `${inverseResult.value} ans`
                      : `${fmt(inverseResult.value)} ${inverseResult.unit}`}
                </p>
              </div>
              <div className="sm:ml-auto text-indigo-200 text-sm sm:text-right">
                {inverseVariant === 'monthlyIncome'
                  ? <>pour un revenu de<br /><span className="font-semibold text-white">{fmt(desiredMonthly)} / mois</span></>
                  : <>pour atteindre<br /><span className="font-semibold text-white">{fmt(targetAmount)}</span></>
                }
              </div>
            </div>
          )}

          {/* Graphique */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <div className="h-52 md:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={v =>
                    v >= 1000000 ? `${(v / 1000000).toFixed(1)}M €`
                    : v >= 1000  ? `${(v / 1000).toFixed(0)}k €`
                    : `${v} €`
                  }
                  width={64}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={value => ({
                    investi:   'Capital investi',
                    interets:  'Intérêts cumulés',
                    pessTotal: `Pessimiste (${pessimisticRate}%)`,
                    optiTotal: `Optimiste (${optimisticRate}%)`,
                  }[value] ?? value)}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="investi"  stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.45} />
                <Area type="monotone" dataKey="interets" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.45} />
                {showScenarios && <>
                  <Line type="monotone" dataKey="pessTotal" stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  <Line type="monotone" dataKey="optiTotal" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                </>}
                {crossoverIndex >= 0 && (
                  <ReferenceLine
                    x={chartData[crossoverIndex].label}
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    label={{ value: '⚡ croisement', position: 'insideTopRight', fontSize: 11, fill: '#16a34a', fontWeight: 600 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Synthèse */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Patrimoine estimé après {resolvedDuration} ans
              {durationMode === 'targetYear' && mode !== 'inverse' && ` — en ${targetYear}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Capital investi</p>
                <p className="text-lg font-semibold text-indigo-700">{fmt(totalInvested)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Intérêts générés</p>
                <p className="text-lg font-semibold" style={{ color: '#f97316' }}>
                  {fmt(totalInterest)}
                  {totalInvested > 0 && (
                    <span className="text-xs text-gray-400 ml-1">(+{Math.round(totalInterest / totalInvested * 100)} %)</span>
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Patrimoine total</p>
                <p className="text-xl font-bold text-gray-900">{fmt(finalCapital)}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mb-4">
              Avec {fmt(initialAmount)} de départ
              {contribution > 0 && ` · ${fmt(contribution)} ${frequency === 'monthly' ? '/mois' : '/an'}${contributionGrowth > 0 ? ` +${contributionGrowth}%/an` : ''}`}
              {inflationRate > 0 && ` · inflation ${fmtPct(inflationRate)} déduite`}
              {applyPFU && ' · PFU 31,4 %'}
            </p>

            {crossoverIndex >= 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 mb-4">
                <span className="text-base">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-green-700">
                    Point de croisement en {chartData[crossoverIndex].label}
                  </p>
                  <p className="text-xs text-green-600">
                    Les intérêts ({fmt(chartData[crossoverIndex].interets)}) dépassent le capital investi ({fmt(chartData[crossoverIndex].investi)}) — l'argent travaille plus que vous.
                  </p>
                </div>
              </div>
            )}

            {withdrawalRate > 0 && (
              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Retrait annuel estimé</p>
                  <p className="text-base font-semibold text-indigo-700">{fmt(annualWithdrawal)} / an</p>
                  <p className="text-xs text-gray-400">à {fmtPct(withdrawalRate)} du capital</p>
                </div>
                <div className="text-center bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Retrait mensuel estimé</p>
                  <p className="text-base font-semibold text-indigo-700">{fmt(monthlyWithdrawal)} / mois</p>
                  <p className="text-xs text-gray-400">revenu passif mensuel</p>
                </div>
              </div>
            )}
          </div>

          {/* Phase de décaissement */}
          {withdrawalRate > 0 && decumulationData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Phase de décaissement
                </h3>
                {isSustainable ? (
                  <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full font-medium self-start sm:self-auto">
                    Capital perpétuel — rendement ≥ taux de retrait
                  </span>
                ) : (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-medium self-start sm:self-auto">
                    Capital épuisé en {decumulationData[Math.min(depletionIndex, decumulationData.length - 1)]?.label}
                    {depletionIndex > 0 && ` — après ${depletionIndex} ans`}
                  </span>
                )}
              </div>
              <div className="h-36 md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={decumulationData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={v =>
                      v >= 1000000 ? `${(v / 1000000).toFixed(1)}M €`
                      : v >= 1000  ? `${(v / 1000).toFixed(0)}k €`
                      : `${v} €`
                    }
                    width={64}
                  />
                  <Tooltip
                    formatter={(value, name) => [fmt(value), 'Capital restant']}
                    labelFormatter={label => {
                      const n = label - (CURRENT_YEAR + resolvedDuration)
                      return `${label} (année ${n} de retraite)`
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="capital"
                    stroke={isSustainable ? '#34d399' : '#6366f1'}
                    fill={isSustainable ? '#34d399' : '#6366f1'}
                    fillOpacity={0.35}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Retrait de {fmt(annualWithdrawal)} / an ({fmt(monthlyWithdrawal)} / mois)
                {' · '}taux de rendement pendant la retraite : {fmtPct(applyPFU ? realRate * 0.686 : realRate)}
                {!isSustainable && ` · durée estimée : ${depletionIndex} an${depletionIndex > 1 ? 's' : ''}`}
              </p>
            </div>
          )}

          {/* Tableau année par année */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <button
              onClick={() => setShowTable(v => !v)}
              className="flex items-center justify-between w-full px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide"
            >
              Détail année par année
              <span className="text-gray-400">{showTable ? '▲' : '▼'}</span>
            </button>
            {showTable && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left   text-xs font-semibold text-gray-500">Année</th>
                      <th className="px-4 py-2.5 text-right  text-xs font-semibold text-indigo-600">Capital investi</th>
                      <th className="px-4 py-2.5 text-right  text-xs font-semibold text-indigo-400">Versements cumulés</th>
                      <th className="px-4 py-2.5 text-right  text-xs font-semibold" style={{ color: '#f97316' }}>Intérêts cumulés</th>
                      <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-700">Total</th>
                      {contributionGrowth > 0 && (
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                          Versement {frequency === 'monthly' ? '/mois' : '/an'}
                        </th>
                      )}
                      {showScenarios && <>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-red-400">Pessimiste</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-green-500">Optimiste</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => {
                      const isCrossover = i === crossoverIndex
                      return (
                      <tr key={row.label} className={isCrossover ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-700">
                          {row.label}
                          {isCrossover && <span className="ml-1.5 text-xs font-semibold text-green-600">⚡</span>}
                          {row.lumpSum > 0 && <span className="ml-1.5 text-xs font-semibold text-violet-500">+{fmt(row.lumpSum)}</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-indigo-600 amount">{fmt(row.investi)}</td>
                        <td className="px-4 py-2 text-right text-indigo-400 amount">{fmt(row.investi - initialAmount)}</td>
                        <td
                          className="px-4 py-2 text-right amount cursor-help"
                          style={{ color: '#f97316' }}
                          onMouseEnter={i === 0 ? undefined : e => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const prev = chartData[i - 1]
                            const effectiveRate = applyPFU ? realRate * 0.686 : realRate
                            const annualContribs = row.versement * (frequency === 'monthly' ? 12 : 1)
                            const flipUp = window.innerHeight - rect.bottom < 320
                            setInteretTooltip({
                              x: rect.left,
                              y: flipUp ? rect.top - 6 : rect.bottom + 6,
                              flipUp,
                              row, prev, effectiveRate, annualContribs,
                            })
                          }}
                          onMouseLeave={() => setInteretTooltip(null)}
                        >
                          {fmt(row.interets)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900 amount">{fmt(row.total)}</td>
                        {contributionGrowth > 0 && (
                          <td className="px-4 py-2 text-right text-gray-500 amount">{fmt(row.versement)}</td>
                        )}
                        {showScenarios && <>
                          <td className="px-4 py-2 text-right text-red-400 amount">{fmt(row.pessTotal)}</td>
                          <td className="px-4 py-2 text-right text-green-500 amount">{fmt(row.optiTotal)}</td>
                        </>}
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Tooltip intérêts cumulés — rendu en position fixe pour éviter le clipping */}
      {interetTooltip && (() => {
        const { row, prev, effectiveRate, annualContribs } = interetTooltip
        const total = row.yearIntFromCapital + row.yearIntFromContrib
        const rateStr = fmtPct(effectiveRate).replace(' %', '%')
        return (
          <div
            className="fixed z-50 w-72 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-xl flex flex-col gap-1.5 pointer-events-none"
            style={interetTooltip.flipUp
              ? { left: interetTooltip.x, bottom: window.innerHeight - interetTooltip.y }
              : { left: interetTooltip.x, top: interetTooltip.y }
            }
          >
            {/* Paramètres */}
            <span className="font-semibold text-gray-400 uppercase tracking-wide text-[10px]">Paramètres du calcul</span>
            <span className="flex justify-between text-gray-400">
              <span>Capital de départ</span><span>{fmt(initialAmount)}</span>
            </span>
            <span className="flex justify-between text-gray-400">
              <span>Versement {frequency === 'monthly' ? 'mensuel' : 'annuel'}</span>
              <span>{fmt(row.versement)}</span>
            </span>
            <span className="flex justify-between text-gray-400 border-b border-gray-700 pb-1.5">
              <span>Taux réel</span><span>{fmtPct(effectiveRate)}</span>
            </span>

            {/* Calcul */}
            <span className="font-semibold pt-0.5">Intérêts générés en {row.label}</span>
            <span className="flex justify-between gap-2">
              <span className="text-gray-300">Sur le capital placé</span>
              <span className="text-right text-gray-500 font-mono">{fmt(prev.total)} × {rateStr}</span>
            </span>
            <span className="flex justify-between gap-2 -mt-1">
              <span />
              <span className="font-semibold text-orange-300">= +{fmt(row.yearIntFromCapital)}</span>
            </span>
            <span className="flex justify-between gap-2">
              <span className="text-gray-300">Sur les versements</span>
              <span className="text-right text-gray-500 font-mono">{fmt(annualContribs)} × {rateStr} *</span>
            </span>
            <span className="flex justify-between gap-2 -mt-1">
              <span />
              <span className="font-semibold text-orange-300">= +{fmt(row.yearIntFromContrib)}</span>
            </span>
            <span className="flex justify-between gap-2 border-t border-gray-700 pt-1.5">
              <span className="text-gray-300">Total cette année</span>
              <span className="font-semibold text-white">+{fmt(total)}</span>
            </span>
            <span className="flex justify-between gap-2 border-t border-gray-700 pt-1.5 text-gray-400">
              <span>Cumulés depuis le départ</span>
              <span>{fmt(row.interets)}</span>
            </span>
            {row.lumpSum > 0 && (
              <span className="flex flex-col gap-0.5 border-t border-gray-700 pt-1.5">
                <span className="text-emerald-400 font-semibold">Apport ponctuel en {row.label} : +{fmt(row.lumpSum)}</span>
                <span className="text-gray-500">Ajouté après le calcul des intérêts — capitalisera à partir de {row.label + 1}.</span>
              </span>
            )}
            <span className="text-gray-500 border-t border-gray-700 pt-1.5 leading-relaxed">
              * Les versements {frequency === 'monthly' ? 'mensuels capitalisent progressivement sur l\'année — le premier versement capitalise 11 mois, le dernier 0 mois' : 'annuels sont investis en début d\'année'}. Voir note de bas de page.
            </span>
          </div>
        )
      })()}

      {/* Note de bas de page */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-xs font-medium text-gray-400 mb-2">
          <sup>*</sup> Méthodologie de calcul
          {mode === 'inverse' && <span className="ml-1 text-indigo-400">— mode inversé actif</span>}
        </p>
        <ol className="space-y-1">
          {footnotes.map((note, i) => (
            <li key={i} className="text-xs text-gray-400 flex gap-2">
              <span className="shrink-0 font-medium text-gray-300">{i + 1}.</span>
              <span>{note}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
