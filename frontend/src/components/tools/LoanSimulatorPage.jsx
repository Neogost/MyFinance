import { useState, useMemo, useEffect, useRef } from 'react'
import {
  ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { simulateTax, simulateTaxForUser } from '../../api/tools'
import { getUsers } from '../../api/users'
import { getMyGroupMembers } from '../../api/familyGroup'
import {
  CURRENT_YEAR, LOAN_STORAGE_KEY, DONUT_COLORS,
  fmt, fmtPct, computeNotaryFees, computeTAEG, buildAmortizationTable,
} from './loanSimulatorUtils'
import { NumInput, AmountPctInput, Section, PropertyTypeToggle } from './LoanSimulatorInputs'
import AmortizationTable from './AmortizationTable'

// ── Composant principal ───────────────────────────────────────────────────────

export default function LoanSimulatorPage({ user }) {
  // Revenus
  const [apiIncome, setApiIncome]           = useState(null)
  const [incomeLoading, setIncomeLoading]   = useState(true)
  const [incomeOverride, setIncomeOverride] = useState('')
  const [additionalIncomes, setAdditionalIncomes] = useState([])
  const [userPickerOpen, setUserPickerOpen]       = useState(null)
  const [usersList, setUsersList]                 = useState([])
  const [usersLoading, setUsersLoading]           = useState(false)
  const [userSearchQuery, setUserSearchQuery]     = useState('')
  const [incomeLoadingFor, setIncomeLoadingFor]   = useState(null)

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

  // Revente
  const [showResale, setShowResale]                   = useState(false)
  const [resaleYear, setResaleYear]                   = useState(10)
  const [resalePrice, setResalePrice]                 = useState(0)
  const [resaleAgencyFeesPct, setResaleAgencyFeesPct] = useState(5)
  const [propertyAppreciation, setPropertyAppreciation] = useState(2)

  // Louer vs Acheter
  const [showRentComparison, setShowRentComparison]   = useState(false)
  const [monthlyRent, setMonthlyRent]                 = useState(1200)
  const [rentIncreaseRate, setRentIncreaseRate]       = useState(2)
  const [investmentReturnRate, setInvestmentReturnRate] = useState(5)
  const [rentBuyHorizon, setRentBuyHorizon]           = useState(20)

  // UI
  const [showMonthly, setShowMonthly]     = useState(false)
  const [showTable, setShowTable]         = useState(true)
  const [notaryTooltip, setNotaryTooltip] = useState(null)
  const [tableMaxHeight, setTableMaxHeight] = useState(null)
  const leftPanelRef = useRef(null)
  const tableBodyRef = useRef(null)

  // Simulations sauvegardées
  const [savedSimulations, setSavedSimulations] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOAN_STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [showSaveModal, setShowSaveModal]   = useState(false)
  const [saveName, setSaveName]             = useState('')
  const [showLoadPanel, setShowLoadPanel]   = useState(false)

  useEffect(() => {
    setIncomeLoading(true)
    simulateTax()
      .then(data => setApiIncome(data.salaryIncome ? Math.round(data.salaryIncome / 12) : null))
      .catch(() => setApiIncome(null))
      .finally(() => setIncomeLoading(false))
  }, [])

  useEffect(() => {
    if (!showMonthly || !showTable) return
    const update = () => {
      if (!leftPanelRef.current || !tableBodyRef.current) return
      const leftBottom = leftPanelRef.current.getBoundingClientRect().bottom + window.scrollY
      const tableTop   = tableBodyRef.current.getBoundingClientRect().top   + window.scrollY
      setTableMaxHeight(Math.max(200, Math.floor(leftBottom - tableTop)))
    }
    const obs = new ResizeObserver(update)
    obs.observe(leftPanelRef.current)
    obs.observe(tableBodyRef.current)
    update()
    return () => obs.disconnect()
  }, [showMonthly, showTable])

  useEffect(() => {
    localStorage.setItem(LOAN_STORAGE_KEY, JSON.stringify(savedSimulations))
  }, [savedSimulations])

  function getSimulationSnapshot(name) {
    return {
      id: Date.now(), name, savedAt: new Date().toISOString(),
      propertyPrice, surface, propertyType,
      agencyFees, agencyFeesMode, dossierFees, dossierFeesMode,
      guaranteeFees, guaranteeFeesMode, brokerageFees, brokerageFeesMode,
      loanAmount, personalContrib, loanDuration, annualRate, insuranceRate, insuranceBase,
      participants, ptzEnabled, ptzAmount, ptzDuration, ptzDeferral,
      earlyRepayments, propertyTax, condoFees,
      showComparison, compDuration, compRate,
      showResale, resaleYear, resalePrice, resaleAgencyFeesPct, propertyAppreciation,
      showRentComparison, monthlyRent, rentIncreaseRate, investmentReturnRate, rentBuyHorizon,
      incomeOverride, additionalIncomes,
    }
  }

  function handleSave() {
    const trimmed = saveName.trim()
    if (!trimmed) return
    setSavedSimulations(prev => [getSimulationSnapshot(trimmed), ...prev])
    setSaveName('')
    setShowSaveModal(false)
  }

  function handleLoad(sim) {
    setPropertyPrice(sim.propertyPrice ?? 250000)
    setSurface(sim.surface ?? 0)
    setPropertyType(sim.propertyType ?? 'ancien')
    setAgencyFees(sim.agencyFees ?? 0); setAgencyFeesMode(sim.agencyFeesMode ?? 'percent')
    setDossierFees(sim.dossierFees ?? 1000); setDossierFeesMode(sim.dossierFeesMode ?? 'amount')
    setGuaranteeFees(sim.guaranteeFees ?? 1); setGuaranteeFeesMode(sim.guaranteeFeesMode ?? 'percent')
    setBrokerageFees(sim.brokerageFees ?? 0); setBrokerageFeesMode(sim.brokerageFeesMode ?? 'amount')
    setLoanAmount(sim.loanAmount ?? 200000)
    setPersonalContrib(sim.personalContrib ?? 30000)
    setLoanDuration(sim.loanDuration ?? 20)
    setAnnualRate(sim.annualRate ?? 3.5)
    setInsuranceRate(sim.insuranceRate ?? 0.20)
    setInsuranceBase(sim.insuranceBase ?? 'initial')
    setParticipants(sim.participants ?? [{ id: 1, name: 'Emprunteur 1', percent: 100 }])
    setPtzEnabled(sim.ptzEnabled ?? false)
    setPtzAmount(sim.ptzAmount ?? 30000)
    setPtzDuration(sim.ptzDuration ?? 15)
    setPtzDeferral(sim.ptzDeferral ?? 5)
    setEarlyRepayments(sim.earlyRepayments ?? [])
    setPropertyTax(sim.propertyTax ?? 0)
    setCondoFees(sim.condoFees ?? 0)
    setShowComparison(sim.showComparison ?? false)
    setCompDuration(sim.compDuration ?? 25)
    setCompRate(sim.compRate ?? 3.0)
    setShowResale(sim.showResale ?? false)
    setResaleYear(sim.resaleYear ?? 10)
    setResalePrice(sim.resalePrice ?? 0)
    setResaleAgencyFeesPct(sim.resaleAgencyFeesPct ?? 5)
    setPropertyAppreciation(sim.propertyAppreciation ?? 2)
    setShowRentComparison(sim.showRentComparison ?? false)
    setMonthlyRent(sim.monthlyRent ?? 1200)
    setRentIncreaseRate(sim.rentIncreaseRate ?? 2)
    setInvestmentReturnRate(sim.investmentReturnRate ?? 5)
    setRentBuyHorizon(sim.rentBuyHorizon ?? 20)
    setIncomeOverride(sim.incomeOverride ?? '')
    setAdditionalIncomes(sim.additionalIncomes ?? [])
    setShowLoadPanel(false)
  }

  function handleDeleteSaved(id) {
    setSavedSimulations(prev => prev.filter(s => s.id !== id))
  }

  const baseIncome      = incomeOverride !== '' ? (parseFloat(incomeOverride) || 0) : (apiIncome ?? 0)
  const additionalTotal = additionalIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const monthlyIncome   = baseIncome + additionalTotal

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

    // Simulation de revente
    let resale = null
    if (showResale && resaleYear >= 1) {
      const resaleMonthIdx = Math.min(resaleYear * 12, amortization.rows.length) - 1
      const rowAtResale    = resaleMonthIdx >= 0 ? amortization.rows[resaleMonthIdx] : null
      if (rowAtResale) {
        const remainingCapital     = rowAtResale.capitalTotal
        const effectiveResalePrice = resalePrice > 0
          ? resalePrice
          : Math.round(propertyPrice * Math.pow(1 + propertyAppreciation / 100, resaleYear))
        const resaleFees = Math.round(effectiveResalePrice * resaleAgencyFeesPct / 100)
        const ira = remainingCapital > 0.5
          ? Math.min(remainingCapital * 0.03, 6 * rowAtResale.interets)
          : 0
        const netProceeds          = effectiveResalePrice - resaleFees - Math.round(remainingCapital) - Math.round(ira)
        const rowsUpTo             = amortization.rows.slice(0, resaleMonthIdx + 1)
        const interestPaid         = Math.round(rowsUpTo.reduce((s, r) => s + r.interets, 0))
        const insurancePaid        = Math.round(rowsUpTo.reduce((s, r) => s + r.assurance, 0))
        const chargesPaid          = Math.round(resaleYear * (propertyTax + condoFees * 12))
        const initialCashOut       = Math.max(0, Math.round(acquisitionCost) - loanAmount - ptzAmt)
        const totalNonRecoverable  = initialCashOut + interestPaid + insurancePaid + chargesPaid
        const netGain              = netProceeds - totalNonRecoverable
        resale = {
          effectiveResalePrice, resaleFees,
          remainingCapital: Math.round(remainingCapital), ira: Math.round(ira),
          netProceeds, interestPaid, insurancePaid, chargesPaid,
          initialCashOut, totalNonRecoverable, netGain,
        }
      }
    }

    // Louer vs Acheter
    let rentVsBuy = null
    if (showRentComparison && monthlyRent > 0 && rentBuyHorizon > 0) {
      const horizon         = Math.min(rentBuyHorizon, 40)
      const monthlyInvRate  = investmentReturnRate / 100 / 12
      let rentPortfolio     = Math.max(0, requiredContrib)
      const yearlyRentVsBuy = []
      for (let y = 1; y <= horizon; y++) {
        const yearRows = amortization.rows.filter(r => r.year === y)
        const numMonths = yearRows.length > 0 ? yearRows.length : 12
        for (let m = 0; m < numMonths; m++) {
          const monthRow          = yearRows[m]
          const purchaseMonthlyCost = monthRow
            ? monthRow.mensualite + monthRow.ptzPayment + condoFees + propertyTax / 12
            : condoFees + propertyTax / 12
          const currentMonthRent  = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1 + m / 12)
          const saving            = Math.max(0, purchaseMonthlyCost - currentMonthRent)
          rentPortfolio           = rentPortfolio * (1 + monthlyInvRate) + saving
        }
        const propValue    = propertyPrice * Math.pow(1 + propertyAppreciation / 100, y)
        const lastYearRow  = yearRows[yearRows.length - 1] || amortization.rows[amortization.rows.length - 1]
        const remainDebt   = lastYearRow ? lastYearRow.capitalTotal : 0
        const buyNetWealth = Math.round(propValue * (1 - resaleAgencyFeesPct / 100) - remainDebt)
        yearlyRentVsBuy.push({ year: y, label: `An ${y}`, achat: buyNetWealth, location: Math.round(rentPortfolio) })
      }
      const finalBuyWealth  = yearlyRentVsBuy[yearlyRentVsBuy.length - 1]?.achat ?? 0
      const finalRentWealth = yearlyRentVsBuy[yearlyRentVsBuy.length - 1]?.location ?? 0
      let crossoverYear = null
      for (const d of yearlyRentVsBuy) {
        if (d.achat >= d.location) { crossoverYear = d.year; break }
      }
      rentVsBuy = { horizon, finalBuyWealth, finalRentWealth, advantage: finalBuyWealth - finalRentWealth, crossoverYear, yearlyData: yearlyRentVsBuy }
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
      resale, rentVsBuy,
      donutData: donutItems, capitalChartData, breakdownChartData,
    }
  }, [propertyPrice, surface, propertyType, agencyFees, agencyFeesMode,
      dossierFees, dossierFeesMode, guaranteeFees, guaranteeFeesMode, brokerageFees, brokerageFeesMode,
      loanAmount, personalContrib, loanDuration, annualRate, insuranceRate, insuranceBase,
      ptzEnabled, ptzAmount, ptzDuration, ptzDeferral, earlyRepayments,
      propertyTax, condoFees, showComparison, compDuration, compRate, monthlyIncome,
      showResale, resaleYear, resalePrice, resaleAgencyFeesPct, propertyAppreciation,
      showRentComparison, monthlyRent, rentIncreaseRate, investmentReturnRate, rentBuyHorizon])

  const {
    notaryFees, agencyFeesAmt, dossierFeesAmt, guaranteeFeesAmt, brokerageFeesAmt,
    acquisitionCost, requiredContrib, contribGap,
    amortization, totalInterest, totalInsurance, totalCreditCost, totalProjectCost,
    ptzMonthlyPayment, totalMonthlyAfterDeferral, totalMonthlyCost, monthlyPropertyTax,
    debtRatio, maxLoanCapacity, pricePerSqm, taeg, comparison,
    resale, rentVsBuy,
    donutData, capitalChartData, breakdownChartData,
  } = calc

  const totalPercent    = participants.reduce((s, p) => s + p.percent, 0)
  const percentBalanced = Math.abs(totalPercent - 100) < 0.01

  function addAdditionalIncome() {
    setAdditionalIncomes(prev => [...prev, { id: Date.now(), name: `Co-emprunteur ${prev.length + 1}`, amount: '' }])
  }
  function updateAdditionalIncome(id, field, value) {
    setAdditionalIncomes(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }
  function removeAdditionalIncome(id) {
    setAdditionalIncomes(prev => prev.filter(i => i.id !== id))
  }

  function openUserPicker(incId) {
    setUserPickerOpen(v => v === incId ? null : incId)
    setUserSearchQuery('')
    if (usersList.length === 0) {
      setUsersLoading(true)
      const fetch = user?.familyGroupId ? getMyGroupMembers() : getUsers()
      fetch
        .then(data => setUsersList(Array.isArray(data) ? data : []))
        .catch(() => setUsersList([]))
        .finally(() => setUsersLoading(false))
    }
  }

  async function selectUser(incId, user) {
    updateAdditionalIncome(incId, 'name', `${user.firstName} ${user.lastName}`)
    setUserPickerOpen(null)
    setIncomeLoadingFor(incId)
    try {
      const data   = await simulateTaxForUser(user.id)
      const income = data.salaryIncome ? Math.round(data.salaryIncome / 12) : ''
      updateAdditionalIncome(incId, 'amount', income)
    } catch { /* l'utilisateur peut saisir manuellement */ }
    finally { setIncomeLoadingFor(null) }
  }

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Simulateur d'Emprunt Immobilier</h1>
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={() => { setSaveName(`Simulation du ${new Date().toLocaleDateString('fr-FR')}`); setShowSaveModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Sauvegarder
          </button>
          <div className="relative">
            <button onClick={() => setShowLoadPanel(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
              Mes simulations {savedSimulations.length > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{savedSimulations.length}</span>}
            </button>

            {showLoadPanel && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">Simulations sauvegardées</p>
                  <button onClick={() => setShowLoadPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
                </div>
                {savedSimulations.length === 0
                  ? <p className="px-4 py-6 text-sm text-gray-400 text-center italic">Aucune simulation sauvegardée</p>
                  : <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {savedSimulations.map(sim => (
                        <li key={sim.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{sim.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(sim.savedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {' · '}{sim.loanAmount?.toLocaleString('fr-FR')} € sur {sim.loanDuration} ans à {sim.annualRate} %
                            </p>
                          </div>
                          <button onClick={() => handleLoad(sim)}
                            className="shrink-0 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                            Charger
                          </button>
                          <button onClick={() => handleDeleteSaved(sim.id)}
                            className="shrink-0 text-gray-300 hover:text-red-500 transition text-sm">✕</button>
                        </li>
                      ))}
                    </ul>
                }
              </div>
            )}
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.75 19.5m10.56-5.671-.72-.096m.72.096L17.25 19.5M12 6.75v6m0-6a2.25 2.25 0 0 1 2.25-2.25H15a2.25 2.25 0 0 1 2.25 2.25v.75M12 6.75a2.25 2.25 0 0 0-2.25-2.25H9.75A2.25 2.25 0 0 0 7.5 6.75v.75m4.5-3V3m0 0H9.75M12 3h2.25" />
            </svg>
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Modal sauvegarde */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sauvegarder la simulation</h2>
            <p className="text-sm text-gray-500 mb-4">
              {loanAmount.toLocaleString('fr-FR')} € · {loanDuration} ans · {annualRate} % — mensualité {fmt(calc.totalMonthlyAfterDeferral)}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la simulation</label>
            <input
              type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              placeholder="Ex : Appartement Paris 75011"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-5"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleSave} disabled={!saveName.trim()}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">

        {/* ── Panneau gauche ── */}
        <div className="w-80 shrink-0 space-y-4" ref={leftPanelRef}>

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
                ? <p className="text-lg font-semibold text-indigo-700 amount">{fmt(apiIncome)}/mois</p>
                : <p className="text-sm text-gray-400 italic">Aucun contrat actif — saisir manuellement</p>
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surcharger le revenu mensuel net (€)</label>
              <input type="number" value={incomeOverride} min={0} step={100}
                onChange={e => setIncomeOverride(e.target.value)}
                placeholder={'Ex : 3500'}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                {incomeOverride !== '' ? 'Revenu de profil ignoré pour les calculs' : 'Laisser vide pour utiliser le profil'}
              </p>
            </div>
            {/* Revenus co-emprunteurs */}
            {additionalIncomes.map((inc) => {
              const isPicking   = userPickerOpen === inc.id
              const isLoading   = incomeLoadingFor === inc.id
              const q = userSearchQuery.toLowerCase()
              const filtered    = (Array.isArray(usersList) ? usersList : []).filter(u =>
                (u.login || '').toLowerCase().includes(q) ||
                (u.firstName || '').toLowerCase().includes(q) ||
                (u.lastName || '').toLowerCase().includes(q)
              )
              return (
                <div key={inc.id} className="relative bg-indigo-50 border border-indigo-100 rounded-lg p-3 pr-8">
                  <button onClick={() => removeAdditionalIncome(inc.id)}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-100 transition text-xs">✕</button>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-500">Nom</label>
                        {(user?.familyGroupId || user?.role === 'ADMIN') && (
                          <button onClick={() => openUserPicker(inc.id)}
                            title={user?.familyGroupId ? 'Rechercher un membre du groupe familial' : 'Rechercher un utilisateur'}
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition ${isPicking ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:bg-indigo-100'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            {user?.familyGroupId ? 'Depuis le groupe familial' : 'Depuis un utilisateur'}
                          </button>
                        )}
                      </div>
                      <input type="text" value={inc.name}
                        onChange={e => updateAdditionalIncome(inc.id, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white amount" />

                      {/* Picker utilisateur */}
                      {isPicking && (
                        <div className="mt-1.5 bg-white border border-indigo-200 rounded-lg shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-gray-100">
                            <input type="text" value={userSearchQuery}
                              onChange={e => setUserSearchQuery(e.target.value)}
                              autoFocus placeholder="Rechercher…"
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                          </div>
                          {usersLoading
                            ? <p className="text-xs text-gray-400 text-center py-3">Chargement…</p>
                            : filtered.length === 0
                            ? <p className="text-xs text-gray-400 text-center py-3">Aucun utilisateur trouvé</p>
                            : <ul className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                                {filtered.map(u => (
                                  <li key={u.id}>
                                    <button onClick={() => selectUser(inc.id, u)}
                                      className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition">
                                      <span className="font-medium text-gray-800">{u.firstName} {u.lastName}</span>
                                      <span className="text-gray-400 ml-1.5">({u.login})</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                          }
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Revenu mensuel net (€)</label>
                      {isLoading
                        ? <p className="text-xs text-indigo-500 italic py-1">Chargement du revenu…</p>
                        : <input type="number" value={inc.amount} min={0} step={100}
                            onChange={e => updateAdditionalIncome(inc.id, 'amount', e.target.value)}
                            placeholder="Ex : 2800"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white amount" />
                      }
                    </div>
                  </div>
                </div>
              )
            })}
            <button onClick={addAdditionalIncome}
              className="w-full py-1.5 border border-dashed border-indigo-300 rounded-md text-sm text-indigo-500 hover:bg-indigo-50 transition">
              + Ajouter un revenu (co-emprunteur)
            </button>

            {monthlyIncome > 0 && (
              <div className="text-xs bg-white rounded-md p-2.5 border border-indigo-100 space-y-1">
                {baseIncome > 0 && additionalTotal > 0 && (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>Votre revenu</span>
                      <span className="amount">{fmt(baseIncome)}/mois</span>
                    </div>
                    {additionalIncomes.filter(i => parseFloat(i.amount) > 0).map(i => (
                      <div key={i.id} className="flex justify-between text-gray-400">
                        <span className="truncate max-w-[160px] amount">{i.name || 'Co-emprunteur'}</span>
                        <span className="amount">{fmt(parseFloat(i.amount))}/mois</span>
                      </div>
                    ))}
                    <div className="border-t border-indigo-100 pt-1 mt-0.5" />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{additionalTotal > 0 ? 'Revenu foyer total' : 'Revenu utilisé'}</span>
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
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 amount" />
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

          {/* Simulation de revente */}
          <Section title="Simulation de revente" collapsible defaultOpen={false}>
            <p className="text-xs text-gray-400 -mt-2">Estimez votre gain net si vous revendez avant la fin du prêt.</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showResale} onChange={e => setShowResale(e.target.checked)}
                className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm text-gray-700">Simuler une revente</span>
            </label>
            {showResale && (
              <>
                <NumInput label="Année de revente" value={resaleYear} onChange={setResaleYear}
                  min={1} max={loanDuration} step={1}
                  hint={`Capital restant estimé à cet horizon`} />
                <NumInput label="Prix de revente (€) — 0 = automatique" value={resalePrice} onChange={setResalePrice}
                  min={0} step={5000}
                  hint={resalePrice === 0
                    ? `Auto : ${fmt(propertyPrice * Math.pow(1 + propertyAppreciation / 100, resaleYear))} avec ${propertyAppreciation} %/an`
                    : ''} />
                <NumInput label="Appréciation annuelle du bien (%)" value={propertyAppreciation}
                  onChange={setPropertyAppreciation} min={-5} max={15} step={0.5}
                  hint="Utilisé si prix de revente = 0" />
                <NumInput label="Frais d'agence à la revente (%)" value={resaleAgencyFeesPct}
                  onChange={setResaleAgencyFeesPct} min={0} max={10} step={0.5} />
              </>
            )}
          </Section>

          {/* Louer vs Acheter */}
          <Section title="Louer vs Acheter" collapsible defaultOpen={false}>
            <p className="text-xs text-gray-400 -mt-2">Comparaison patrimoniale sur N ans : propriétaire vs locataire qui investit son apport.</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showRentComparison} onChange={e => setShowRentComparison(e.target.checked)}
                className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm text-gray-700">Activer la comparaison</span>
            </label>
            {showRentComparison && (
              <>
                <NumInput label="Loyer mensuel actuel (€)" value={monthlyRent} onChange={setMonthlyRent}
                  min={0} step={50} hint="Loyer équivalent pour le même bien" />
                <NumInput label="Hausse annuelle du loyer (%)" value={rentIncreaseRate} onChange={setRentIncreaseRate}
                  min={0} max={10} step={0.5} />
                <NumInput label="Rendement placement net (%/an)" value={investmentReturnRate} onChange={setInvestmentReturnRate}
                  min={0} max={20} step={0.5}
                  hint="Taux annuel net appliqué à l'apport et aux économies mensuelles" />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">Horizon d'analyse</label>
                    <span className="text-sm font-semibold text-indigo-700">{rentBuyHorizon} ans</span>
                  </div>
                  <input type="range" min={1} max={40} value={rentBuyHorizon}
                    onChange={e => setRentBuyHorizon(parseInt(e.target.value))}
                    className="w-full accent-indigo-600" />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 an</span><span>40 ans</span></div>
                </div>
                {!showResale && (
                  <>
                    <NumInput label="Appréciation annuelle du bien (%)" value={propertyAppreciation}
                      onChange={setPropertyAppreciation} min={-5} max={15} step={0.5} />
                    <NumInput label="Frais d'agence à la revente (%)" value={resaleAgencyFeesPct}
                      onChange={setResaleAgencyFeesPct} min={0} max={10} step={0.5} />
                  </>
                )}
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
                      <p className="text-xs font-semibold text-indigo-700 truncate mb-1 amount">{p.name}</p>
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

          {/* Simulation de revente */}
          {showResale && resale && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Simulation de revente — An {resaleYear} ({CURRENT_YEAR + resaleYear})
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Produit de la vente</p>
                  <div className="flex justify-between"><span className="text-gray-500">Prix de revente estimé</span><span className="font-medium">{fmt(resale.effectiveResalePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">− Frais d'agence ({resaleAgencyFeesPct} %)</span><span className="text-red-500">− {fmt(resale.resaleFees)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">− Capital restant dû</span><span className="text-red-500">− {fmt(resale.remainingCapital)}</span></div>
                  {resale.ira > 0 && <div className="flex justify-between"><span className="text-gray-500">− IRA (remb. anticipé)</span><span className="text-red-500">− {fmt(resale.ira)}</span></div>}
                  <div className={`flex justify-between font-semibold border-t border-gray-200 pt-2 mt-1 ${resale.netProceeds >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    <span>Produit net de cession</span><span>{fmt(resale.netProceeds)}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Coûts non récupérables</p>
                  <div className="flex justify-between"><span className="text-gray-500">Apport initial + frais achat</span><span>{fmt(resale.initialCashOut)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Intérêts payés</span><span>{fmt(resale.interestPaid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Assurance payée</span><span>{fmt(resale.insurancePaid)}</span></div>
                  {resale.chargesPaid > 0 && <div className="flex justify-between"><span className="text-gray-500">Charges / taxe foncière</span><span>{fmt(resale.chargesPaid)}</span></div>}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-1 text-gray-700">
                    <span>Total sorti de poche</span><span>{fmt(resale.totalNonRecoverable)}</span>
                  </div>
                </div>
              </div>
              <div className={`mt-4 rounded-lg p-4 flex items-center justify-between ${resale.netGain >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Gain / perte net après {resaleYear} an{resaleYear > 1 ? 's' : ''}</p>
                  <p className={`text-2xl font-bold ${resale.netGain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {resale.netGain >= 0 ? '+' : ''}{fmt(resale.netGain)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Produit net vs capital engagé</p>
                  <p className={`text-lg font-semibold ${resale.netProceeds >= resale.initialCashOut ? 'text-green-700' : 'text-red-500'}`}>
                    {resale.initialCashOut > 0 ? `${((resale.netProceeds / resale.initialCashOut - 1) * 100).toFixed(1)} % sur l'apport` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {resalePrice === 0 ? `Appréciation ${propertyAppreciation} %/an supposée` : 'Prix de revente manuel'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Louer vs Acheter */}
          {showRentComparison && rentVsBuy && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Louer vs Acheter — Patrimoine net sur {rentVsBuy.horizon} ans</h3>
              <p className="text-xs text-gray-400 mb-4">
                Locataire investit l'apport ({fmt(requiredContrib)}) + économies mensuelles à {investmentReturnRate} %/an.
                Propriétaire : valeur nette du bien (appréciation {propertyAppreciation} %/an − dette − {resaleAgencyFeesPct} % frais revente).
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`rounded-lg p-4 border ${rentVsBuy.advantage >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className="text-xs text-gray-500 mb-1">Patrimoine acheteur (an {rentVsBuy.horizon})</p>
                  <p className="text-xl font-bold text-indigo-700">{fmt(rentVsBuy.finalBuyWealth)}</p>
                </div>
                <div className={`rounded-lg p-4 border ${rentVsBuy.advantage < 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs text-gray-500 mb-1">Patrimoine locataire (an {rentVsBuy.horizon})</p>
                  <p className="text-xl font-bold text-emerald-700">{fmt(rentVsBuy.finalRentWealth)}</p>
                </div>
                <div className="bg-gray-800 text-white rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {rentVsBuy.advantage >= 0 ? 'Avantage acheteur' : 'Avantage locataire'}
                  </p>
                  <p className="text-xl font-bold">{fmt(Math.abs(rentVsBuy.advantage))}</p>
                  {rentVsBuy.crossoverYear != null
                    ? <p className="text-xs text-gray-400 mt-1">Achat rentable dès l'an {rentVsBuy.crossoverYear}</p>
                    : <p className="text-xs text-gray-400 mt-1">Achat jamais rentable sur l'horizon</p>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={rentVsBuy.yearlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} interval={Math.max(0, Math.floor(rentVsBuy.yearlyData.length / 8) - 1)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={65}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M €` : v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${v} €`} />
                  <Tooltip formatter={(v, name) => [fmt(v), name === 'achat' ? 'Patrimoine acheteur' : 'Patrimoine locataire']} contentStyle={{ fontSize: 12 }} />
                  <Legend formatter={v => v === 'achat' ? 'Acheteur (valeur nette bien)' : 'Locataire (portefeuille investi)'} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="achat"     stroke="#6366f1" strokeWidth={2} dot={false} name="achat" />
                  <Line type="monotone" dataKey="location"  stroke="#10b981" strokeWidth={2} dot={false} name="location" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-3">
                Hypothèses : loyer {fmt(monthlyRent)}/mois, hausse {rentIncreaseRate} %/an — rendement placement {investmentReturnRate} %/an net — appréciation bien {propertyAppreciation} %/an.
                Le locataire investit l'apport initial + toute économie mensuelle (si mensualité achat &gt; loyer).
              </p>
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

          <AmortizationTable
            amortization={amortization}
            showTable={showTable} setShowTable={setShowTable}
            showMonthly={showMonthly} setShowMonthly={setShowMonthly}
            tableMaxHeight={tableMaxHeight} tableBodyRef={tableBodyRef}
            ptzEnabled={ptzEnabled} hasRepayments={hasRepayments}
            loanAmount={loanAmount} totalInterest={totalInterest} totalInsurance={totalInsurance}
            ptzAmount={ptzAmount} totalPrepayments={calc.totalPrepayments}
            currentYear={CURRENT_YEAR}
          />
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
