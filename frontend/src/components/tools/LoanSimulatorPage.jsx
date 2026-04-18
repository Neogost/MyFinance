import { useState, useMemo, useEffect } from 'react'
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { simulateTax } from '../../api/tools'

const CURRENT_YEAR = new Date().getFullYear()

function fmt(amount) {
  if (amount == null || isNaN(amount) || !isFinite(amount)) return '—'
  return Math.round(amount).toLocaleString('fr-FR') + ' €'
}

function fmtPct(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—'
  return val.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' %'
}

// ── Barème émoluments notaire (HT) ───────────────────────────────────────────
function computeEmoluments(price) {
  const tranches = [
    [0, 6500, 0.03945], [6500, 17000, 0.01627],
    [17000, 60000, 0.01085], [60000, Infinity, 0.00814],
  ]
  let emol = 0
  for (const [low, high, rate] of tranches) {
    if (price <= low) break
    emol += (Math.min(price, high) - low) * rate
  }
  return emol
}

// ── Frais de notaire ──────────────────────────────────────────────────────────
function computeNotaryFees(price, type) {
  if (!price || price <= 0) return { total: 0, percent: 0, detail: [] }
  const emolTTC  = computeEmoluments(price) * 1.20
  const securite = Math.max(price * 0.001, 15)
  const debours  = 1200
  if (type === 'neuf' || type === 'vefa') {
    const taxePublicite = price * 0.00715
    const total = taxePublicite + emolTTC + securite + debours
    return { total: Math.round(total), percent: total / price * 100, detail: [
      { label: 'Taxe de publicité foncière (0,715 %)', amount: Math.round(taxePublicite) },
      { label: 'Émoluments du notaire TTC',            amount: Math.round(emolTTC) },
      { label: 'Contribution sécurité immobilière (0,1 %)', amount: Math.round(securite) },
      { label: 'Débours (estimés)',                    amount: debours },
    ] }
  }
  const droitsDept    = price * 0.045
  const taxeCommune   = price * 0.012
  const fraisAssiette = droitsDept * 0.0237
  const total = droitsDept + taxeCommune + fraisAssiette + securite + emolTTC + debours
  return { total: Math.round(total), percent: total / price * 100, detail: [
    { label: 'Droits de mutation départementaux (4,50 %)', amount: Math.round(droitsDept) },
    { label: 'Taxe communale additionnelle (1,20 %)',      amount: Math.round(taxeCommune) },
    { label: "Frais d'assiette et recouvrement (2,37 %)",  amount: Math.round(fraisAssiette) },
    { label: 'Contribution sécurité immobilière (0,10 %)', amount: Math.round(securite) },
    { label: 'Émoluments du notaire TTC',                  amount: Math.round(emolTTC) },
    { label: 'Débours (estimés)',                          amount: debours },
  ] }
}

// ── Mensualité (formule annuité) ──────────────────────────────────────────────
function computeMonthlyPayment(capital, annualRate, months) {
  if (!capital || capital <= 0 || months <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return capital / months
  return capital * r / (1 - Math.pow(1 + r, -months))
}

// ── Dichotomie numérique ──────────────────────────────────────────────────────
function bisect(fn, low, high, target) {
  for (let i = 0; i < 70; i++) {
    const mid = (low + high) / 2
    if (fn(mid) < target) low = mid; else high = mid
  }
  return (low + high) / 2
}

// ── TAEG estimé ───────────────────────────────────────────────────────────────
function computeTAEG(loanAmount, rows, totalFees) {
  if (loanAmount <= 0 || rows.length === 0) return null
  const feesMonthly = totalFees / rows.length
  const cashFlows   = rows.map(r => r.mensualite + feesMonthly)
  function pv(rate) {
    if (rate === 0) return cashFlows.reduce((s, cf) => s + cf, 0)
    return cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0)
  }
  const monthlyRate = bisect(rate => loanAmount - pv(rate), 0, 0.1, 0)
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100
}

// ── Tableau d'amortissement ───────────────────────────────────────────────────
function buildAmortizationTable({
  loanAmount, annualRate, loanDurationYears, insuranceRate, insuranceBase,
  ptzEnabled, ptzAmount, ptzDurationYears, ptzDeferralYears,
  earlyRepayments = [],
}) {
  const n  = loanDurationYears * 12
  const r  = annualRate / 100 / 12
  let currentPayment = computeMonthlyPayment(loanAmount, annualRate, n)
  const initialInsurance = loanAmount * insuranceRate / 100 / 12

  const ptzDeferMonths = ptzEnabled ? ptzDeferralYears * 12 : 0
  const ptzRepayMonths = ptzEnabled ? Math.max(1, (ptzDurationYears - ptzDeferralYears) * 12) : 0
  const ptzMonthly     = ptzEnabled && ptzRepayMonths > 0 ? ptzAmount / ptzRepayMonths : 0

  const sortedRepayments = [...earlyRepayments]
    .map(er => ({ ...er, targetMonth: er.year * 12 }))
    .sort((a, b) => a.targetMonth - b.targetMonth)

  let capitalMain = loanAmount
  let capitalPtz  = ptzEnabled ? ptzAmount : 0
  const rows = []

  for (let t = 1; t <= n + 12 && capitalMain > 0.5; t++) {
    const insurance     = insuranceBase === 'remaining'
      ? capitalMain * insuranceRate / 100 / 12
      : initialInsurance
    const interets      = capitalMain * r
    const amortissement = Math.min(currentPayment - interets, capitalMain)
    capitalMain = Math.max(0, capitalMain - amortissement)

    let ptzPayment = 0
    if (ptzEnabled && t > ptzDeferMonths && t <= ptzDeferMonths + ptzRepayMonths) {
      ptzPayment = ptzMonthly
      capitalPtz = Math.max(0, capitalPtz - ptzMonthly)
    }

    let prepayment = 0
    let ira = 0
    const er = sortedRepayments.find(e => e.targetMonth === t)
    if (er && er.amount > 0 && capitalMain > 0) {
      prepayment  = Math.min(er.amount, capitalMain)
      ira         = Math.min(prepayment * 0.03, 6 * interets)
      capitalMain = Math.max(0, capitalMain - prepayment)
      if (er.mode === 'reduce_payment' && capitalMain > 0.5) {
        const rem = n - t
        if (rem > 0) currentPayment = computeMonthlyPayment(capitalMain, annualRate, rem)
      }
    }

    rows.push({
      month: t, year: Math.ceil(t / 12),
      interets, amortissement,
      assurance:    insurance,
      mensualite:   currentPayment + insurance,
      ptzPayment, prepayment, ira,
      capitalMain:  Math.max(0, capitalMain),
      capitalPtz:   Math.max(0, capitalPtz),
      capitalTotal: Math.max(0, capitalMain + capitalPtz),
    })
  }

  const actualYears = Math.ceil(rows.length / 12)
  const annualSummary = []
  for (let y = 1; y <= actualYears; y++) {
    const yRows = rows.filter(r => r.year === y)
    if (!yRows.length) continue
    const last = yRows[yRows.length - 1]
    annualSummary.push({
      year: y, label: `An ${y}`,
      interets:      Math.round(yRows.reduce((s, r) => s + r.interets, 0)),
      amortissement: Math.round(yRows.reduce((s, r) => s + r.amortissement, 0)),
      assurance:     Math.round(yRows.reduce((s, r) => s + r.assurance, 0)),
      ptzPayment:    Math.round(yRows.reduce((s, r) => s + r.ptzPayment, 0)),
      prepayment:    Math.round(yRows.reduce((s, r) => s + r.prepayment, 0)),
      capitalMain:   Math.round(last?.capitalMain ?? 0),
      capitalPtz:    Math.round(last?.capitalPtz ?? 0),
      capitalTotal:  Math.round(last?.capitalTotal ?? 0),
    })
  }

  return {
    rows, annualSummary,
    monthlyPrincipal: computeMonthlyPayment(loanAmount, annualRate, n),
    monthlyInsurance: initialInsurance,
    ptzMonthly,
    actualMonths: rows.length,
  }
}

// ── Sub-composants ────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, min, max, step = 1, hint, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step} disabled={disabled}
        className={`w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${disabled ? 'bg-gray-50 text-gray-400' : ''}`}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function AmountPctInput({ label, value, onChange, mode, onModeChange, hint, referenceAmount }) {
  const computedHint = mode === 'percent' && referenceAmount > 0 && value > 0
    ? `≈ ${fmt(referenceAmount * value / 100)}`
    : mode === 'amount' && referenceAmount > 0 && value > 0
    ? `≈ ${(value / referenceAmount * 100).toFixed(2)} %`
    : hint
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex">
        <input type="number" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={0} step={mode === 'percent' ? 0.1 : 500}
          className="flex-1 border border-r-0 border-gray-300 rounded-l-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:z-10"
        />
        <div className="flex border border-gray-300 rounded-r-md overflow-hidden text-xs shrink-0">
          <button onClick={() => onModeChange('amount')}
            className={`px-2.5 transition ${mode === 'amount' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>€</button>
          <button onClick={() => onModeChange('percent')}
            className={`px-2.5 border-l border-gray-300 transition ${mode === 'percent' ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>%</button>
        </div>
      </div>
      {computedHint && <p className="text-xs text-gray-400 mt-0.5">{computedHint}</p>}
    </div>
  )
}

function Section({ title, children, collapsible = false, defaultOpen = true, accent = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const base      = accent ? 'bg-indigo-50 rounded-xl border border-indigo-100 p-5' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-5'
  const titleClass = accent ? 'text-sm font-semibold text-indigo-700 uppercase tracking-wide' : 'text-sm font-semibold text-gray-500 uppercase tracking-wide'
  return (
    <div className={base}>
      {collapsible
        ? <button onClick={() => setOpen(v => !v)} className={`flex items-center justify-between w-full ${titleClass}`}>
            {title}<span className={accent ? 'text-indigo-400' : 'text-gray-400'}>{open ? '▲' : '▼'}</span>
          </button>
        : <h2 className={titleClass}>{title}</h2>}
      {(!collapsible || open) && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  )
}

function PropertyTypeToggle({ value, onChange }) {
  return (
    <div className="flex border border-gray-300 rounded-md overflow-hidden text-sm w-full">
      {[{ v: 'ancien', label: 'Ancien' }, { v: 'neuf', label: 'Neuf' }, { v: 'vefa', label: 'VEFA' }].map(({ v, label }) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 py-1.5 transition ${value === v ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{label}</button>
      ))}
    </div>
  )
}

const DONUT_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f97316', '#f59e0b']

// ── Composant principal ───────────────────────────────────────────────────────

export default function LoanSimulatorPage() {
  // Revenus
  const [apiIncome, setApiIncome]           = useState(null)
  const [incomeLoading, setIncomeLoading]   = useState(true)
  const [incomeOverride, setIncomeOverride] = useState('')

  // Bien
  const [propertyPrice, setPropertyPrice]         = useState(250000)
  const [surface, setSurface]                     = useState(0)
  const [propertyType, setPropertyType]           = useState('ancien')
  const [agencyFees, setAgencyFees]               = useState(0)
  const [agencyFeesMode, setAgencyFeesMode]       = useState('percent')
  const [dossierFees, setDossierFees]             = useState(1000)
  const [dossierFeesMode, setDossierFeesMode]     = useState('amount')
  const [guaranteeFees, setGuaranteeFees]         = useState(1)
  const [guaranteeFeesMode, setGuaranteeFeesMode] = useState('percent')
  const [brokerageFees, setBrokerageFees]         = useState(0)
  const [brokerageFeesMode, setBrokerageFeesMode] = useState('amount')

  // Emprunt
  const [loanAmount, setLoanAmount]           = useState(200000)
  const [personalContrib, setPersonalContrib] = useState(30000)
  const [loanDuration, setLoanDuration]       = useState(20)
  const [annualRate, setAnnualRate]           = useState(3.5)
  const [insuranceRate, setInsuranceRate]     = useState(0.20)
  const [insuranceBase, setInsuranceBase]     = useState('initial') // 'initial' | 'remaining'

  // Participants
  const [participants, setParticipants] = useState([{ id: 1, name: 'Emprunteur 1', percent: 100 }])

  // PTZ
  const [ptzEnabled, setPtzEnabled]   = useState(false)
  const [ptzAmount, setPtzAmount]     = useState(30000)
  const [ptzDuration, setPtzDuration] = useState(15)
  const [ptzDeferral, setPtzDeferral] = useState(5)

  // Remboursement anticipé
  const [earlyRepayments, setEarlyRepayments] = useState([]) // [{ id, year, amount, mode }]

  // Charges propriétaire
  const [propertyTax, setPropertyTax] = useState(0)   // taxe foncière annuelle
  const [condoFees, setCondoFees]     = useState(0)   // charges copropriété mensuelles

  // Comparaison de scénarios
  const [showComparison, setShowComparison] = useState(false)
  const [compDuration, setCompDuration]     = useState(25)
  const [compRate, setCompRate]             = useState(3.0)

  // UI
  const [showMonthly, setShowMonthly]     = useState(false)
  const [showTable, setShowTable]         = useState(true)
  const [notaryTooltip, setNotaryTooltip] = useState(null)

  useEffect(() => {
    setIncomeLoading(true)
    simulateTax()
      .then(data => setApiIncome(data.salaryIncome ? Math.round(data.salaryIncome / 12) : null))
      .catch(() => setApiIncome(null))
      .finally(() => setIncomeLoading(false))
  }, [])

  const monthlyIncome = incomeOverride !== '' ? (parseFloat(incomeOverride) || 0) : (apiIncome ?? 0)

  // ── Calculs principaux ────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const notaryFees       = computeNotaryFees(propertyPrice, propertyType)
    const agencyFeesAmt    = agencyFeesMode    === 'percent' ? propertyPrice * agencyFees / 100    : agencyFees
    const dossierFeesAmt   = dossierFeesMode   === 'percent' ? loanAmount    * dossierFees / 100   : dossierFees
    const guaranteeFeesAmt = guaranteeFeesMode === 'percent' ? loanAmount    * guaranteeFees / 100 : guaranteeFees
    const brokerageFeesAmt = brokerageFeesMode === 'percent' ? loanAmount    * brokerageFees / 100 : brokerageFees
    const acquisitionCost  = propertyPrice + agencyFeesAmt + notaryFees.total + dossierFeesAmt + guaranteeFeesAmt + brokerageFeesAmt
    const ptzAmt           = ptzEnabled ? ptzAmount : 0
    const requiredContrib  = Math.max(0, acquisitionCost - loanAmount - ptzAmt)
    const contribGap       = requiredContrib - personalContrib

    const amortization = buildAmortizationTable({
      loanAmount, annualRate, loanDurationYears: loanDuration,
      insuranceRate, insuranceBase,
      ptzEnabled, ptzAmount, ptzDurationYears: ptzDuration, ptzDeferralYears: ptzDeferral,
      earlyRepayments,
    })

    const totalInterest    = Math.round(amortization.rows.reduce((s, r) => s + r.interets, 0))
    const totalInsurance   = Math.round(amortization.rows.reduce((s, r) => s + r.assurance, 0))
    const totalPrepayments = Math.round(amortization.rows.reduce((s, r) => s + r.prepayment, 0))
    const totalFees        = Math.round(dossierFeesAmt) + Math.round(guaranteeFeesAmt) + Math.round(brokerageFeesAmt)
    const totalCreditCost  = totalInterest + totalInsurance + totalFees
    const totalProjectCost = Math.round(acquisitionCost) + totalInterest + totalInsurance

    const ptzMonthlyPayment        = amortization.ptzMonthly
    const totalMonthlyAfterDeferral = amortization.monthlyPrincipal + amortization.monthlyInsurance
                                    + (ptzEnabled ? ptzMonthlyPayment : 0)

    const n = loanDuration * 12
    const r = annualRate / 100 / 12
    const debtRatio       = monthlyIncome > 0 ? totalMonthlyAfterDeferral / monthlyIncome * 100 : 0
    const mensMax         = monthlyIncome * 0.35 - amortization.monthlyInsurance
    const maxLoanCapacity = mensMax > 0
      ? (r > 0 ? mensMax * (1 - Math.pow(1 + r, -n)) / r : mensMax * n)
      : 0

    // Coût mensuel total avec charges propriétaire
    const monthlyPropertyTax   = propertyTax / 12
    const totalMonthlyCost     = totalMonthlyAfterDeferral + condoFees + monthlyPropertyTax

    const pricePerSqm = surface > 0 ? Math.round(propertyPrice / surface) : null

    // TAEG
    const taeg = computeTAEG(loanAmount, amortization.rows, totalFees)

    // Scénario de comparaison
    let comparison = null
    if (showComparison) {
      const compAmo = buildAmortizationTable({
        loanAmount, annualRate: compRate, loanDurationYears: compDuration,
        insuranceRate, insuranceBase: 'initial',
        ptzEnabled, ptzAmount, ptzDurationYears: ptzDuration, ptzDeferralYears: ptzDeferral,
        earlyRepayments: [],
      })
      const compInt = Math.round(compAmo.rows.reduce((s, r) => s + r.interets, 0))
      const compIns = Math.round(compAmo.rows.reduce((s, r) => s + r.assurance, 0))
      const compTotal = compAmo.monthlyPrincipal + compAmo.monthlyInsurance + (ptzEnabled ? compAmo.ptzMonthly : 0)
      const compDebt  = monthlyIncome > 0 ? compTotal / monthlyIncome * 100 : 0
      const compTAEG  = computeTAEG(loanAmount, compAmo.rows, totalFees)
      comparison = {
        duration: compDuration, rate: compRate,
        monthlyTotal: compTotal,
        totalInterest: compInt, totalInsurance: compIns,
        totalCreditCost: compInt + compIns + totalFees,
        taeg: compTAEG, debtRatio: compDebt,
        actualMonths: compAmo.actualMonths,
      }
    }

    // Données graphiques
    const donutItems = [
      { name: 'Prix du bien',       value: Math.round(propertyPrice) },
      agencyFeesAmt > 0 && { name: "Frais d'agence", value: Math.round(agencyFeesAmt) },
      { name: 'Frais de notaire',   value: notaryFees.total },
      { name: 'Intérêts du crédit', value: totalInterest },
      { name: 'Assurance emprunt',  value: totalInsurance },
    ].filter(Boolean).filter(d => d.value > 0)

    const capitalChartData = [
      { label: `${CURRENT_YEAR}`, capitalMain: Math.round(loanAmount), capitalPtz: Math.round(ptzAmt) },
      ...amortization.annualSummary.map(y => ({
        label: `${CURRENT_YEAR + y.year}`,
        capitalMain: y.capitalMain, capitalPtz: y.capitalPtz,
      }))
    ]

    const breakdownChartData = amortization.annualSummary.map(y => ({
      label: y.label, interets: y.interets, amortissement: y.amortissement,
    }))

    return {
      notaryFees, agencyFeesAmt, dossierFeesAmt, guaranteeFeesAmt, brokerageFeesAmt,
      acquisitionCost, requiredContrib, contribGap,
      amortization, totalInterest, totalInsurance, totalPrepayments, totalFees,
      totalCreditCost, totalProjectCost,
      ptzMonthlyPayment, totalMonthlyAfterDeferral, totalMonthlyCost,
      monthlyPropertyTax,
      debtRatio, maxLoanCapacity, pricePerSqm, taeg, comparison,
      donutData: donutItems, capitalChartData, breakdownChartData,
    }
  }, [propertyPrice, surface, propertyType, agencyFees, agencyFeesMode,
      dossierFees, dossierFeesMode, guaranteeFees, guaranteeFeesMode, brokerageFees, brokerageFeesMode,
      loanAmount, personalContrib, loanDuration, annualRate, insuranceRate, insuranceBase,
      ptzEnabled, ptzAmount, ptzDuration, ptzDeferral, earlyRepayments,
      propertyTax, condoFees, showComparison, compDuration, compRate, monthlyIncome])

  const {
    notaryFees, agencyFeesAmt, dossierFeesAmt, guaranteeFeesAmt, brokerageFeesAmt,
    acquisitionCost, requiredContrib, contribGap,
    amortization, totalInterest, totalInsurance, totalCreditCost, totalProjectCost,
    ptzMonthlyPayment, totalMonthlyAfterDeferral, totalMonthlyCost, monthlyPropertyTax,
    debtRatio, maxLoanCapacity, pricePerSqm, taeg, comparison,
    donutData, capitalChartData, breakdownChartData,
  } = calc

  const totalPercent    = participants.reduce((s, p) => s + p.percent, 0)
  const percentBalanced = Math.abs(totalPercent - 100) < 0.01

  function addParticipant() {
    const remaining = Math.max(0, 100 - totalPercent)
    setParticipants(prev => [...prev, { id: Date.now(), name: `Emprunteur ${prev.length + 1}`, percent: remaining }])
  }
  function updateParticipant(id, field, value) {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }
  function removeParticipant(id) {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  function addEarlyRepayment() {
    setEarlyRepayments(prev => [...prev, { id: Date.now(), year: 5, amount: 20000, mode: 'reduce_duration' }])
  }
  function updateEarlyRepayment(id, field, value) {
    setEarlyRepayments(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }
  function removeEarlyRepayment(id) {
    setEarlyRepayments(prev => prev.filter(e => e.id !== id))
  }

  const debtColor = debtRatio > 35 ? 'text-red-600 bg-red-50 border-red-100'
    : debtRatio > 33 ? 'text-amber-600 bg-amber-50 border-amber-100'
    : 'text-green-700 bg-green-50 border-green-100'

  const { monthlyPrincipal, monthlyInsurance } = amortization
  const monthlyTotal = monthlyPrincipal + monthlyInsurance

  const hasCharges     = propertyTax > 0 || condoFees > 0
  const hasRepayments  = earlyRepayments.length > 0

  // Durée effective (peut être réduite par remboursements anticipés mode reduce_duration)
  const effectiveMonths = amortization.actualMonths
  const effectiveYears  = Math.ceil(effectiveMonths / 12)
  const durationReduced = effectiveMonths < loanDuration * 12

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Simulateur d'Emprunt Immobilier</h1>

      <div className="flex gap-6 items-start">

        {/* ── Panneau gauche ── */}
        <div className="w-80 shrink-0 space-y-4">

          {/* Revenus */}
          <Section title="Revenus" accent={!!apiIncome && !incomeLoading}>
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Revenu net mensuel
                {apiIncome && !incomeLoading && <span className="ml-1.5 text-indigo-400 font-medium">depuis votre profil</span>}
              </p>
              {incomeLoading
                ? <p className="text-sm text-gray-400 italic py-1">Chargement…</p>
                : apiIncome
                ? <p className="text-lg font-semibold text-indigo-700">{fmt(apiIncome)}/mois</p>
                : <p className="text-sm text-gray-400 italic">Aucun contrat actif — saisir manuellement</p>
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surcharger le revenu mensuel net (€)</label>
              <input type="number" value={incomeOverride} min={0} step={100}
                onChange={e => setIncomeOverride(e.target.value)}
                placeholder={apiIncome ? String(apiIncome) : 'Ex : 3500'}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {incomeOverride !== '' ? 'Revenu de profil ignoré pour les calculs' : 'Laisser vide pour utiliser le profil'}
              </p>
            </div>
            {monthlyIncome > 0 && (
              <div className="text-xs bg-white rounded-md p-2.5 border border-indigo-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenu utilisé</span>
                  <span className="font-semibold text-gray-700">{fmt(monthlyIncome)}/mois</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mensualité max (35 %)</span>
                  <span className="font-semibold text-indigo-700">{fmt(monthlyIncome * 0.35)}/mois</span>
                </div>
              </div>
            )}
          </Section>

          {/* Le bien */}
          <Section title="Le bien">
            <NumInput label="Prix du bien (€)" value={propertyPrice} onChange={setPropertyPrice} min={0} step={5000} />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <NumInput label="Superficie (m²)" value={surface || ''} onChange={setSurface} min={0} step={1} />
              </div>
              {pricePerSqm != null && (
                <div className="pb-1.5 text-sm font-semibold text-indigo-600 whitespace-nowrap shrink-0">
                  {pricePerSqm.toLocaleString('fr-FR')} €/m²
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de bien</label>
              <PropertyTypeToggle value={propertyType} onChange={setPropertyType} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frais de notaire (estimés)</label>
              <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-md px-3 py-2 cursor-help"
                onMouseEnter={e => { const rect = e.currentTarget.getBoundingClientRect(); setNotaryTooltip({ x: rect.left, y: rect.bottom + 6 }) }}
                onMouseLeave={() => setNotaryTooltip(null)}>
                <span className="text-sm font-semibold text-gray-800 underline decoration-dotted">{fmt(notaryFees.total)}</span>
                <span className="text-xs text-gray-500">≈ {notaryFees.percent?.toFixed(1)} % — survoler pour le détail</span>
              </div>
            </div>
            <AmountPctInput label="Frais d'agence" value={agencyFees} onChange={setAgencyFees}
              mode={agencyFeesMode} onModeChange={setAgencyFeesMode} referenceAmount={propertyPrice}
              hint="Laisser à 0 si vente entre particuliers" />
            <AmountPctInput label="Frais de dossier" value={dossierFees} onChange={setDossierFees}
              mode={dossierFeesMode} onModeChange={setDossierFeesMode} referenceAmount={loanAmount} />
            <AmountPctInput label="Frais de garantie" value={guaranteeFees} onChange={setGuaranteeFees}
              mode={guaranteeFeesMode} onModeChange={setGuaranteeFeesMode} referenceAmount={loanAmount}
              hint="Caution (Crédit Logement) ou hypothèque" />
            <AmountPctInput label="Frais de courtage" value={brokerageFees} onChange={setBrokerageFees}
              mode={brokerageFeesMode} onModeChange={setBrokerageFeesMode} referenceAmount={loanAmount}
              hint="Honoraires du courtier en crédit immobilier" />

            {/* Récap acquisition */}
            <div className="text-xs bg-gray-50 rounded-md p-3 space-y-1 border border-gray-100">
              <div className="flex justify-between text-gray-500"><span>Prix du bien</span><span>{fmt(propertyPrice)}</span></div>
              {agencyFeesAmt > 0 && <div className="flex justify-between text-gray-500"><span>+ Frais d'agence</span><span>{fmt(agencyFeesAmt)}</span></div>}
              <div className="flex justify-between text-gray-500 cursor-help underline decoration-dotted"
                onMouseEnter={e => { const rect = e.currentTarget.getBoundingClientRect(); setNotaryTooltip({ x: rect.left, y: rect.bottom + 6 }) }}
                onMouseLeave={() => setNotaryTooltip(null)}>
                <span>+ Frais de notaire</span><span>{fmt(notaryFees.total)}</span>
              </div>
              {dossierFeesAmt > 0 && <div className="flex justify-between text-gray-500"><span>+ Frais de dossier</span><span>{fmt(dossierFeesAmt)}</span></div>}
              {guaranteeFeesAmt > 0 && <div className="flex justify-between text-gray-500"><span>+ Frais de garantie</span><span>{fmt(guaranteeFeesAmt)}</span></div>}
              {brokerageFeesAmt > 0 && <div className="flex justify-between text-gray-500"><span>+ Frais de courtage</span><span>{fmt(brokerageFeesAmt)}</span></div>}
              <div className="flex justify-between font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1">
                <span>Coût total acquisition</span><span>{fmt(acquisitionCost)}</span>
              </div>
              <div className="flex justify-between text-gray-500 pt-0.5"><span>− Emprunt</span><span>{fmt(loanAmount)}</span></div>
              {ptzEnabled && <div className="flex justify-between text-gray-500"><span>− PTZ</span><span>{fmt(ptzAmount)}</span></div>}
              <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1 ${contribGap > 0 ? 'text-red-600' : 'text-green-700'}`}>
                <span>Apport nécessaire</span><span>{fmt(requiredContrib)}</span>
              </div>
              {contribGap > 0 && <div className="text-red-500 text-right">manque {fmt(contribGap)}</div>}
              {contribGap <= 0 && requiredContrib > 0 && <div className="text-green-600 text-right">✓ couvert par l'apport</div>}
            </div>
          </Section>

          {/* L'emprunt */}
          <Section title="L'emprunt">
            <NumInput label="Montant emprunté (€)" value={loanAmount} onChange={setLoanAmount} min={0} step={5000} />
            <NumInput label="Apport personnel (€)" value={personalContrib} onChange={setPersonalContrib} min={0} step={5000} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Durée</label>
                <span className="text-sm font-semibold text-indigo-700">{loanDuration} ans</span>
              </div>
              <input type="range" min={5} max={30} value={loanDuration}
                onChange={e => setLoanDuration(parseInt(e.target.value))}
                className="w-full accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>5 ans</span><span>30 ans</span></div>
            </div>
            <NumInput label="Taux d'intérêt annuel (%)" value={annualRate} onChange={setAnnualRate} min={0.1} max={15} step={0.05} />
            <div>
              <NumInput label="Taux d'assurance (%/an)" value={insuranceRate} onChange={setInsuranceRate}
                min={0} max={2} step={0.01}
                hint={`Assurance mensuelle estimée : ${fmt(monthlyInsurance)}/mois`} />
              <div className="flex gap-1 mt-2">
                {[{ v: 'initial', label: 'Sur capital initial' }, { v: 'remaining', label: 'Sur capital restant' }].map(({ v, label }) => (
                  <button key={v} onClick={() => setInsuranceBase(v)}
                    className={`flex-1 py-1 text-xs rounded-md border transition ${insuranceBase === v ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {insuranceBase === 'remaining' && (
                <p className="text-xs text-indigo-500 mt-1">Assurance décroissante — moins chère sur la durée</p>
              )}
            </div>
          </Section>

          {/* Participants */}
          <Section title="Participants à l'emprunt" collapsible defaultOpen={participants.length > 1}>
            <p className="text-xs text-gray-400 -mt-2">Répartition des mensualités entre co-emprunteurs</p>
            {participants.map(p => (
              <div key={p.id} className="relative bg-gray-50 rounded-lg p-3 pr-8">
                {participants.length > 1 && (
                  <button onClick={() => removeParticipant(p.id)}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-100 transition text-xs">✕</button>
                )}
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nom</label>
                    <input type="text" value={p.name}
                      onChange={e => updateParticipant(p.id, 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Part (%)</label>
                    <input type="number" value={p.percent} min={0} max={100} step={1}
                      onChange={e => updateParticipant(p.id, 'percent', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addParticipant}
              className="w-full py-1.5 border border-dashed border-indigo-300 rounded-md text-sm text-indigo-500 hover:bg-indigo-50 transition">
              + Ajouter un co-emprunteur
            </button>
            <div className={`flex justify-between text-xs font-semibold px-1 ${percentBalanced ? 'text-green-700' : 'text-red-500'}`}>
              <span>Total</span>
              <span>{totalPercent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %{percentBalanced ? ' ✓' : ' — doit être égal à 100 %'}</span>
            </div>
          </Section>

          {/* PTZ */}
          <Section title="Prêt à Taux Zéro (PTZ)" collapsible defaultOpen={false}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ptzEnabled} onChange={e => setPtzEnabled(e.target.checked)}
                className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm text-gray-700">Inclure un PTZ</span>
            </label>
            {ptzEnabled && (
              <>
                <NumInput label="Montant du PTZ (€)" value={ptzAmount} onChange={setPtzAmount} min={0} step={5000} />
                <NumInput label="Durée de remboursement (ans)" value={ptzDuration} onChange={setPtzDuration} min={5} max={25} />
                <NumInput label="Période de différé (ans)" value={ptzDeferral} onChange={setPtzDeferral}
                  min={0} max={Math.max(0, ptzDuration - 1)} step={1}
                  hint="Pendant cette période, seul le prêt principal est remboursé" />
                {ptzMonthlyPayment > 0 && (
                  <div className="text-xs text-violet-700 bg-violet-50 rounded-md p-2 border border-violet-100">
                    Mensualité PTZ après différé : <span className="font-semibold">{fmt(ptzMonthlyPayment)}/mois</span>
                    {' '}pendant {ptzDuration - ptzDeferral} an{ptzDuration - ptzDeferral > 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Remboursement anticipé */}
          <Section title="Remboursement anticipé" collapsible defaultOpen={hasRepayments}>
            <p className="text-xs text-gray-400 -mt-2">Prime, héritage, vente d'un bien…</p>
            {earlyRepayments.map(er => (
              <div key={er.id} className="relative bg-emerald-50 border border-emerald-100 rounded-lg p-3 pr-8">
                <button onClick={() => removeEarlyRepayment(er.id)}
                  className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-100 transition text-xs">✕</button>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Année (depuis maintenant)</label>
                    <input type="number" value={er.year} min={1} max={loanDuration - 1} step={1}
                      onChange={e => updateEarlyRepayment(er.id, 'year', parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Montant (€)</label>
                    <input type="number" value={er.amount} min={0} step={5000}
                      onChange={e => updateEarlyRepayment(er.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Impact souhaité</label>
                    <div className="flex gap-1">
                      {[{ v: 'reduce_duration', label: 'Réduire la durée' }, { v: 'reduce_payment', label: 'Réduire la mensualité' }].map(({ v, label }) => (
                        <button key={v} onClick={() => updateEarlyRepayment(er.id, 'mode', v)}
                          className={`flex-1 py-1 text-xs rounded border transition ${er.mode === v ? 'bg-emerald-600 text-white border-emerald-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addEarlyRepayment}
              className="w-full py-1.5 border border-dashed border-emerald-400 rounded-md text-sm text-emerald-600 hover:bg-emerald-50 transition">
              + Ajouter un remboursement anticipé
            </button>
            <p className="text-xs text-gray-400">IRA estimées : min(3 % du capital restant, 6 mois d'intérêts) — affichées dans le tableau.</p>
          </Section>

          {/* Charges propriétaire */}
          <Section title="Charges propriétaire" collapsible defaultOpen={false}>
            <NumInput label="Taxe foncière (€/an)" value={propertyTax} onChange={setPropertyTax} min={0} step={100}
              hint={propertyTax > 0 ? `≈ ${fmt(propertyTax / 12)}/mois` : 'Estimée à 1–2 % du prix du bien selon la commune'} />
            <NumInput label="Charges de copropriété (€/mois)" value={condoFees} onChange={setCondoFees} min={0} step={50}
              hint={condoFees > 0 ? `≈ ${fmt(condoFees * 12)}/an` : 'Laisser à 0 pour une maison individuelle'} />
            {hasCharges && (
              <div className="text-xs bg-gray-50 rounded-md p-2.5 border border-gray-100 space-y-1">
                <div className="flex justify-between text-gray-500"><span>Mensualité crédit</span><span>{fmt(totalMonthlyAfterDeferral)}</span></div>
                {condoFees > 0 && <div className="flex justify-between text-gray-500"><span>+ Charges copropriété</span><span>{fmt(condoFees)}</span></div>}
                {monthlyPropertyTax > 0 && <div className="flex justify-between text-gray-500"><span>+ Taxe foncière</span><span>{fmt(monthlyPropertyTax)}</span></div>}
                <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                  <span>Coût mensuel total</span><span>{fmt(calc.totalMonthlyCost)}</span>
                </div>
              </div>
            )}
          </Section>

          {/* Comparaison de scénarios */}
          <Section title="Comparaison de scénarios" collapsible defaultOpen={false}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showComparison} onChange={e => setShowComparison(e.target.checked)}
                className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm text-gray-700">Activer la comparaison</span>
            </label>
            {showComparison && (
              <>
                <p className="text-xs text-gray-400">Même montant emprunté, mêmes frais — seuls le taux et la durée changent.</p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Durée comparée</label>
                    <span className="text-sm font-semibold text-indigo-700">{compDuration} ans</span>
                  </div>
                  <input type="range" min={5} max={30} value={compDuration}
                    onChange={e => setCompDuration(parseInt(e.target.value))}
                    className="w-full accent-indigo-600" />
                </div>
                <NumInput label="Taux comparé (%)" value={compRate} onChange={setCompRate} min={0.1} max={15} step={0.05} />
              </>
            )}
          </Section>
        </div>

        {/* ── Panneau droit ── */}
        <div className="flex-1 space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Mensualité principale</p>
              <p className="text-xl font-bold text-gray-900">{fmt(monthlyTotal)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
              <p className="text-xs text-gray-400 mt-1">Crédit {fmt(monthlyPrincipal)} + Ass. {fmt(monthlyInsurance)}</p>
              {ptzEnabled && ptzMonthlyPayment > 0 && (
                <p className="text-xs font-semibold text-violet-600 mt-1">
                  + PTZ {fmt(ptzMonthlyPayment)} après différé<br />= <span className="text-gray-900">{fmt(totalMonthlyAfterDeferral)}/mois</span>
                </p>
              )}
              {durationReduced && hasRepayments && (
                <p className="text-xs text-emerald-600 mt-1">✓ Durée réduite à {effectiveYears} ans</p>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${debtColor}`}>
              <p className="text-xs mb-1 opacity-70">Taux d'endettement</p>
              <p className="text-xl font-bold">{fmtPct(debtRatio)}</p>
              <p className="text-xs mt-1 opacity-80">
                {debtRatio > 35 ? '⚠ Dépasse le seuil HCSF (35 %)' : debtRatio > 33 ? 'Proche du seuil HCSF (35 %)' : '✓ Sous le seuil HCSF (35 %)'}
              </p>
              {maxLoanCapacity > 0 && monthlyIncome > 0 && (
                <p className="text-xs mt-1 opacity-70">Capacité max : {fmt(maxLoanCapacity)}</p>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Coût total du crédit</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totalCreditCost)}</p>
              <p className="text-xs text-gray-400 mt-1">{fmt(totalInterest)} intérêts<br />{fmt(totalInsurance)} assurance</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Coût total du projet</p>
              <p className="text-xl font-bold text-gray-900">{fmt(totalProjectCost)}</p>
              <p className="text-xs text-gray-400 mt-1">Acquisition {fmt(acquisitionCost)}<br />+ Crédit {fmt(totalInterest + totalInsurance)}</p>
            </div>
          </div>

          {/* Bannière TAEG + coût mensuel total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 text-white rounded-xl p-4 flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">TAEG estimé</p>
                <p className="text-2xl font-bold">{taeg != null ? fmtPct(taeg) : '—'}</p>
                <p className="text-xs text-gray-400 mt-1">Intègre intérêts, assurance et frais bancaires</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400 mb-0.5">Durée effective</p>
                <p className="text-lg font-semibold">
                  {effectiveYears} ans{durationReduced && hasRepayments && (
                    <span className="ml-1 text-xs text-emerald-400">({loanDuration - effectiveYears} an{loanDuration - effectiveYears > 1 ? 's' : ''} gagnés)</span>
                  )}
                </p>
                {insuranceBase === 'remaining' && (
                  <p className="text-xs text-indigo-300 mt-1">Assurance sur capital restant</p>
                )}
              </div>
            </div>

            <div className={`rounded-xl p-4 border ${hasCharges ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 shadow-sm'}`}>
              <p className="text-xs text-gray-500 mb-1">Coût mensuel total</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(calc.totalMonthlyCost)}</p>
              <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                <div className="flex justify-between"><span>Crédit + assurance</span><span>{fmt(totalMonthlyAfterDeferral)}</span></div>
                {condoFees > 0 && <div className="flex justify-between"><span>Charges copropriété</span><span>{fmt(condoFees)}</span></div>}
                {monthlyPropertyTax > 0 && <div className="flex justify-between"><span>Taxe foncière</span><span>{fmt(monthlyPropertyTax)}</span></div>}
                {!hasCharges && <span className="italic">Ajouter charges et taxe foncière dans le panneau gauche</span>}
              </div>
            </div>
          </div>

          {/* Comparaison de scénarios */}
          {showComparison && comparison && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Comparaison de scénarios</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs text-gray-500 font-semibold">Paramètre</th>
                    <th className="text-right py-2 text-xs text-indigo-600 font-semibold">Scénario principal</th>
                    <th className="text-right py-2 text-xs text-emerald-600 font-semibold">Scénario comparé</th>
                    <th className="text-right py-2 text-xs text-gray-400 font-semibold">Différence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'Durée', main: `${loanDuration} ans`, comp: `${compDuration} ans`, diff: null },
                    { label: 'Taux nominal', main: fmtPct(annualRate), comp: fmtPct(compRate), diff: null },
                    { label: 'TAEG estimé', main: fmtPct(taeg), comp: fmtPct(comparison.taeg), diff: taeg != null && comparison.taeg != null ? comparison.taeg - taeg : null, isRate: true },
                    { label: 'Mensualité', main: fmt(monthlyTotal), comp: fmt(comparison.monthlyTotal), diff: comparison.monthlyTotal - monthlyTotal, isNeg: true },
                    { label: 'Taux d\'endettement', main: fmtPct(debtRatio), comp: fmtPct(comparison.debtRatio), diff: comparison.debtRatio - debtRatio, isRate: true, isNeg: true },
                    { label: 'Total intérêts', main: fmt(totalInterest), comp: fmt(comparison.totalInterest), diff: comparison.totalInterest - totalInterest },
                    { label: 'Total assurance', main: fmt(totalInsurance), comp: fmt(comparison.totalInsurance), diff: comparison.totalInsurance - totalInsurance },
                    { label: 'Coût total crédit', main: fmt(totalCreditCost), comp: fmt(comparison.totalCreditCost), diff: comparison.totalCreditCost - totalCreditCost },
                  ].map(({ label, main, comp, diff, isNeg, isRate }) => {
                    const diffColor = diff == null ? ''
                      : (isNeg ? diff < 0 : diff > 0) ? 'text-emerald-600' : diff === 0 ? 'text-gray-400' : 'text-red-500'
                    const diffFmt = diff == null ? '—'
                      : isRate ? `${diff > 0 ? '+' : ''}${diff.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
                      : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('fr-FR')} €`
                    return (
                      <tr key={label}>
                        <td className="py-2 text-gray-600">{label}</td>
                        <td className="py-2 text-right font-semibold text-indigo-600">{main}</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">{comp}</td>
                        <td className={`py-2 text-right text-xs font-semibold ${diffColor}`}>{diffFmt}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">Le scénario comparé utilise le même montant emprunté, le même taux d'assurance et les mêmes frais. Seuls le taux et la durée diffèrent.</p>
            </div>
          )}

          {/* Répartition par participant */}
          {participants.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Mensualités par co-emprunteur
                {!percentBalanced && <span className="ml-2 text-xs text-red-400 normal-case font-normal">⚠ total ≠ 100 %</span>}
              </h3>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(participants.length, 4)}, 1fr)` }}>
                {participants.map(p => {
                  const share      = totalMonthlyAfterDeferral * p.percent / 100
                  const sharePrinc = monthlyPrincipal           * p.percent / 100
                  const shareIns   = monthlyInsurance            * p.percent / 100
                  const sharePtz   = ptzEnabled ? ptzMonthlyPayment * p.percent / 100 : 0
                  return (
                    <div key={p.id} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-700 truncate mb-1">{p.name}</p>
                      <p className="text-xs text-gray-500 mb-2">{p.percent} % de l'emprunt</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(share)}<span className="text-xs font-normal text-gray-400">/mois</span></p>
                      <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                        <div className="flex justify-between"><span>Crédit</span><span>{fmt(sharePrinc)}</span></div>
                        <div className="flex justify-between"><span>Assurance</span><span>{fmt(shareIns)}</span></div>
                        {ptzEnabled && sharePtz > 0 && (
                          <div className="flex justify-between text-violet-500"><span>PTZ</span><span>{fmt(sharePtz)}</span></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition des coûts globaux</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [fmt(value), name]} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Capital restant dû</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={capitalChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(capitalChartData.length / 5) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={58}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M €` : v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === 'capitalMain' ? 'Capital principal' : 'Capital PTZ']} contentStyle={{ fontSize: 12 }} />
                  {ptzEnabled && <Legend formatter={v => v === 'capitalMain' ? 'Prêt principal' : 'PTZ'} wrapperStyle={{ fontSize: 11 }} />}
                  <Area type="monotone" dataKey="capitalMain" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} name="capitalMain" dot={false} />
                  {ptzEnabled && <Area type="monotone" dataKey="capitalPtz" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} name="capitalPtz" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Répartition annuelle — intérêts vs amortissement du capital</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={breakdownChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(breakdownChartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={58}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                <Tooltip formatter={(v, name) => [fmt(v), name === 'interets' ? 'Intérêts' : 'Amortissement']} contentStyle={{ fontSize: 12 }} />
                <Legend formatter={v => v === 'interets' ? 'Intérêts' : 'Amortissement capital'} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="interets"      stackId="a" fill="#f97316" fillOpacity={0.85} name="interets" />
                <Bar dataKey="amortissement" stackId="a" fill="#6366f1" fillOpacity={0.85} name="amortissement" radius={[3, 3, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau d'amortissement */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={() => setShowTable(v => !v)}
                className="text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 flex items-center gap-2">
                Tableau d'amortissement
                <span className="text-gray-400">{showTable ? '▲' : '▼'}</span>
              </button>
              {showTable && (
                <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
                  <button onClick={() => setShowMonthly(false)}
                    className={`px-3 py-1.5 transition ${!showMonthly ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Annuel</button>
                  <button onClick={() => setShowMonthly(true)}
                    className={`px-3 py-1.5 border-l border-gray-200 transition ${showMonthly ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Mensuel</button>
                </div>
              )}
            </div>

            {showTable && (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{showMonthly ? 'Mois' : 'Année'}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">Mensualité</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: '#f97316' }}>Intérêts</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-indigo-600">Amortissement</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-amber-600">Assurance</th>
                      {ptzEnabled && <th className="px-4 py-2.5 text-right text-xs font-semibold text-violet-600">PTZ</th>}
                      {hasRepayments && <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">Remb. anticipé</th>}
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Capital restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!showMonthly
                      ? amortization.annualSummary.map((row, i) => {
                          const hasPrepay = row.prepayment > 0
                          return (
                            <tr key={row.year} className={hasPrepay ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 font-medium text-gray-700">
                                {CURRENT_YEAR + row.year}
                                <span className="text-xs text-gray-400 ml-1">(an {row.year})</span>
                                {hasPrepay && <span className="ml-1.5 text-xs text-emerald-600 font-semibold">↓</span>}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">{fmt(row.interets + row.amortissement + row.assurance)}</td>
                              <td className="px-4 py-2 text-right" style={{ color: '#f97316' }}>{fmt(row.interets)}</td>
                              <td className="px-4 py-2 text-right text-indigo-600">{fmt(row.amortissement)}</td>
                              <td className="px-4 py-2 text-right text-amber-600">{fmt(row.assurance)}</td>
                              {ptzEnabled && <td className="px-4 py-2 text-right text-violet-600">{fmt(row.ptzPayment)}</td>}
                              {hasRepayments && <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{row.prepayment > 0 ? fmt(row.prepayment) : '—'}</td>}
                              <td className="px-4 py-2 text-right text-gray-500 font-medium">{fmt(row.capitalTotal)}</td>
                            </tr>
                          )
                        })
                      : amortization.rows.map((row, i) => {
                          const hasPrepay = row.prepayment > 0
                          return (
                            <tr key={row.month} className={hasPrepay ? 'bg-emerald-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 font-medium text-gray-700 tabular-nums">
                                {String(row.month).padStart(3, '0')}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({CURRENT_YEAR + Math.floor((row.month - 1) / 12)}-{String(((row.month - 1) % 12) + 1).padStart(2, '0')})
                                </span>
                                {hasPrepay && <span className="ml-1.5 text-xs text-emerald-600 font-semibold">↓ Remb. anticipé</span>}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">{fmt(row.mensualite)}</td>
                              <td className="px-4 py-2 text-right" style={{ color: '#f97316' }}>{fmt(row.interets)}</td>
                              <td className="px-4 py-2 text-right text-indigo-600">{fmt(row.amortissement)}</td>
                              <td className="px-4 py-2 text-right text-amber-600">{fmt(row.assurance)}</td>
                              {ptzEnabled && <td className="px-4 py-2 text-right text-violet-600">{fmt(row.ptzPayment)}</td>}
                              {hasRepayments && <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{row.prepayment > 0 ? fmt(row.prepayment) : '—'}</td>}
                              <td className="px-4 py-2 text-right text-gray-500 font-medium">{fmt(row.capitalTotal)}</td>
                            </tr>
                          )
                        })
                    }
                    <tr className="bg-indigo-50 font-semibold border-t-2 border-indigo-100">
                      <td className="px-4 py-3 text-indigo-800">Total</td>
                      <td className="px-4 py-3 text-right text-indigo-800">{fmt(totalInterest + loanAmount + totalInsurance)}</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#f97316' }}>{fmt(totalInterest)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{fmt(loanAmount)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{fmt(totalInsurance)}</td>
                      {ptzEnabled && <td className="px-4 py-3 text-right text-violet-600">{fmt(ptzEnabled ? ptzAmount : 0)}</td>}
                      {hasRepayments && <td className="px-4 py-3 text-right text-emerald-600">{fmt(calc.totalPrepayments)}</td>}
                      <td className="px-4 py-3 text-right text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tooltip frais de notaire ── */}
      {notaryTooltip && (
        <div className="fixed z-50 w-80 rounded-lg bg-gray-900 text-white text-xs p-4 shadow-xl pointer-events-none"
          style={{ left: notaryTooltip.x, top: notaryTooltip.y }}>
          <p className="font-semibold text-gray-300 uppercase tracking-wide text-[10px] mb-2">
            Détail frais de notaire — bien {propertyType === 'ancien' ? 'ancien' : propertyType === 'neuf' ? 'neuf' : 'VEFA'}
          </p>
          {notaryFees.detail.map((line, i) => (
            <div key={i} className="flex justify-between gap-4 py-0.5">
              <span className="text-gray-300">{line.label}</span>
              <span className="font-semibold text-white shrink-0">{fmt(line.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-gray-700 mt-2 pt-2 font-semibold">
            <span>Total estimé</span>
            <span className="text-indigo-300">{fmt(notaryFees.total)}</span>
          </div>
          <div className="text-center text-gray-500 mt-0.5">soit {notaryFees.percent?.toFixed(1)} % du prix du bien</div>
          <div className="text-gray-500 mt-2 border-t border-gray-700 pt-2 leading-relaxed">
            ⚠ Estimation — les frais réels sont calculés par le notaire. Débours ({fmt(1200)}) : forfait indicatif.
          </div>
        </div>
      )}

      {/* Notes méthodologiques */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-xs font-medium text-gray-400 mb-2"><sup>*</sup> Méthodologie de calcul</p>
        <ol className="space-y-1">
          {[
            "La mensualité est calculée par la formule d'annuité à taux fixe : M = C × r / (1 − (1+r)^−n), où r est le taux mensuel (taux annuel / 12) et n la durée en mois.",
            insuranceBase === 'remaining'
              ? "L'assurance est calculée chaque mois sur le capital restant dû — elle diminue au fil du remboursement."
              : "L'assurance est calculée sur le capital initial (pratique la plus courante). Certaines banques la calculent sur le capital restant dû, ce qui réduit le coût.",
            `Les frais de notaire sont estimés selon le barème légal français (bien ${propertyType}).`,
            "Le TAEG (Taux Annuel Effectif Global) est calculé par dichotomie : on cherche le taux mensuel r tel que la somme actualisée de toutes les mensualités (crédit + assurance + frais bancaires répartis) égale le capital emprunté. TAEG = (1+r)¹² − 1.",
            hasRepayments
              ? "Les remboursements anticipés réduisent le capital restant dû au mois indiqué. En mode 'réduire la durée', la mensualité reste identique et le prêt se termine plus tôt. En mode 'réduire la mensualité', la durée reste fixe et la mensualité est recalculée. Les IRA (indemnités de remboursement anticipé) sont estimées à min(3 % du capital, 6 mois d'intérêts) — elles ne sont pas déduites automatiquement."
              : null,
            showComparison ? "La comparaison utilise le même montant emprunté, le même taux d'assurance et les mêmes frais. Seuls le taux et la durée diffèrent." : null,
            "Le taux d'endettement HCSF est calculé sur la mensualité totale après différé PTZ rapportée au revenu mensuel net. Seuil réglementaire : 35 %.",
          ].filter(Boolean).map((note, i) => (
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
