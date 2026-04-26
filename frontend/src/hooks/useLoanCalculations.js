import { useMemo } from 'react'
import { computeNotaryFees, computeTAEG, buildAmortizationTable, CURRENT_YEAR } from '../components/tools/loanSimulatorUtils'

export function useLoanCalculations({
  propertyPrice, surface, propertyType,
  agencyFees, agencyFeesMode, dossierFees, dossierFeesMode,
  guaranteeFees, guaranteeFeesMode, brokerageFees, brokerageFeesMode,
  loanAmount, personalContrib, loanDuration, annualRate, insuranceRate, insuranceBase,
  ptzEnabled, ptzAmount, ptzDuration, ptzDeferral,
  earlyRepayments, propertyTax, condoFees,
  monthlyIncome,
  showComparison, compDuration, compRate,
  showResale, resaleYear, resalePrice, resaleAgencyFeesPct, propertyAppreciation,
  showRentComparison, monthlyRent, rentIncreaseRate, investmentReturnRate, rentBuyHorizon,
}) {
  return useMemo(() => {
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
}
