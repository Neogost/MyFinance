import { FISCAL_PARAMS } from '../data/fiscal-envelopes'

// ── Utilitaires ──────────────────────────────────────────────────────────────

function monthlyGross(annualReturn, fees) {
  return (annualReturn - fees) / 100 / 12
}

// Capitalisation mensuelle — retourne le tableau année par année
function buildYearlyData(initialAmount, monthlyContrib, durationYears, netMonthlyRate) {
  const data = []
  let capital = initialAmount
  const months = durationYears * 12

  for (let m = 1; m <= months; m++) {
    capital = capital * (1 + netMonthlyRate) + monthlyContrib
    if (m % 12 === 0) {
      data.push({ year: m / 12, capital })
    }
  }
  return data
}

// ── CTO ──────────────────────────────────────────────────────────────────────

export function simulateCTO({
  initialAmount,
  monthlyContribution,
  duration,
  annualReturn,   // rendement propre au CTO
  fees,
  dividendYield,
  currentTMI,
  taxOption,      // 'pfu' | 'bareme'
}) {
  const F = FISCAL_PARAMS
  const totalContribs = initialAmount + monthlyContribution * duration * 12

  const divTaxRate = taxOption === 'bareme'
    ? currentTMI / 100 + F.SOCIAL_CHARGES_RATE
    : F.PFU_RATE

  const grossMonthly = annualReturn / 100 / 12
  const divMonthly   = dividendYield / 100 / 12
  const netMonthly   = grossMonthly - divMonthly * divTaxRate - fees / 100 / 12

  const yearlyData   = buildYearlyData(initialAmount, monthlyContribution, duration, netMonthly)
  const capitalGross = yearlyData[yearlyData.length - 1]?.capital ?? initialAmount

  const gains       = Math.max(0, capitalGross - totalContribs)
  const gainTaxRate = taxOption === 'bareme'
    ? currentTMI / 100 + F.SOCIAL_CHARGES_RATE
    : F.PFU_RATE

  const taxAtExit  = gains * gainTaxRate
  const netCapital = capitalGross - taxAtExit
  const totalFees  = totalContribs * (fees / 100) * duration

  return { capitalGross, totalContribs, totalFees, taxAtEntry: 0, taxAtExit, netCapital, yearlyData, annualReturn }
}

// ── PEA ──────────────────────────────────────────────────────────────────────

export function simulatePEA({
  initialAmount,
  monthlyContribution,
  duration,
  annualReturn,   // rendement propre au PEA
  fees,
  taxOption,
}) {
  const F = FISCAL_PARAMS
  const totalContribs  = initialAmount + monthlyContribution * duration * 12
  const peaCapBreached = totalContribs > F.PEA_CAP

  const netMonthly   = monthlyGross(annualReturn, fees)
  const yearlyData   = buildYearlyData(initialAmount, monthlyContribution, duration, netMonthly)
  const capitalGross = yearlyData[yearlyData.length - 1]?.capital ?? initialAmount

  const gains = Math.max(0, capitalGross - totalContribs)
  let taxAtExit

  if (duration < 5) {
    const rate = taxOption === 'bareme' ? F.SOCIAL_CHARGES_RATE : F.PFU_RATE
    taxAtExit = gains * rate
  } else {
    taxAtExit = gains * F.SOCIAL_CHARGES_RATE
  }

  const netCapital = capitalGross - taxAtExit
  const totalFees  = totalContribs * (fees / 100) * duration

  return { capitalGross, totalContribs, totalFees, taxAtEntry: 0, taxAtExit, netCapital, yearlyData, peaCapBreached, annualReturn }
}

// ── Assurance-vie ─────────────────────────────────────────────────────────────

export function simulateAV({
  initialAmount,
  monthlyContribution,
  duration,
  annualReturn,   // rendement propre à l'AV
  fees,
  householdSituation,
  taxOption,
}) {
  const F = FISCAL_PARAMS
  const totalContribs = initialAmount + monthlyContribution * duration * 12

  const netMonthly   = monthlyGross(annualReturn, fees)
  const yearlyData   = buildYearlyData(initialAmount, monthlyContribution, duration, netMonthly)
  const capitalGross = yearlyData[yearlyData.length - 1]?.capital ?? initialAmount

  const gains = Math.max(0, capitalGross - totalContribs)
  let taxAtExit

  if (duration < 8) {
    const rate = taxOption === 'bareme' ? F.SOCIAL_CHARGES_RATE : F.PFU_RATE
    taxAtExit = gains * rate
  } else {
    const abatement    = householdSituation === 'couple' ? F.AV_ABATEMENT_COUPLE : F.AV_ABATEMENT_SINGLE
    const taxableGains = Math.max(0, gains - abatement)

    if (totalContribs <= F.AV_FAVORABLE_THRESHOLD) {
      taxAtExit = taxableGains * F.AV_REDUCED_TOTAL_RATE
    } else {
      const ratioFavorable = Math.min(1, F.AV_FAVORABLE_THRESHOLD / totalContribs)
      const favorable = taxableGains * ratioFavorable
      const auPFU     = taxableGains * (1 - ratioFavorable)
      taxAtExit = favorable * F.AV_REDUCED_TOTAL_RATE + auPFU * F.PFU_RATE
    }
  }

  const netCapital = capitalGross - taxAtExit
  const totalFees  = totalContribs * (fees / 100) * duration

  return { capitalGross, totalContribs, totalFees, taxAtEntry: 0, taxAtExit, netCapital, yearlyData, annualReturn }
}

// ── PER ───────────────────────────────────────────────────────────────────────

export function simulatePER({
  initialAmount,
  monthlyContribution,
  duration,
  annualReturn,   // rendement propre au PER — aussi utilisé pour le réinvestissement de l'éco. fiscale
  fees,
  currentTMI,
  retirementTMI,
  perAnnualCap,
  reinvestTaxSaving,
}) {
  const F = FISCAL_PARAMS
  const totalContribs   = initialAmount + monthlyContribution * duration * 12
  const annualContrib   = monthlyContribution * 12
  const cappedAnnual    = Math.min(annualContrib, perAnnualCap)
  const annualTaxSaving = cappedAnnual * currentTMI / 100
  const totalTaxSavings = annualTaxSaving * duration

  const netMonthly   = monthlyGross(annualReturn, fees)
  const yearlyData   = buildYearlyData(initialAmount, monthlyContribution, duration, netMonthly)
  const capitalGross = yearlyData[yearlyData.length - 1]?.capital ?? initialAmount

  const gains        = Math.max(0, capitalGross - totalContribs)
  const taxOnCapital = totalContribs * retirementTMI / 100
  const taxOnGains   = gains * F.PFU_RATE
  const taxAtExit    = taxOnCapital + taxOnGains

  let netSavings = 0
  if (reinvestTaxSaving && annualTaxSaving > 0) {
    // L'économie d'impôt est réinvestie au même rendement que le PER (même profil investisseur)
    const ctoRate = annualReturn / 100 / 12
    let ctoCapital = 0
    for (let y = 1; y <= duration; y++) {
      ctoCapital = (ctoCapital + annualTaxSaving) * Math.pow(1 + ctoRate, 12)
    }
    const ctoGains     = Math.max(0, ctoCapital - totalTaxSavings)
    const ctoTaxAtExit = ctoGains * F.PFU_RATE
    netSavings = ctoCapital - ctoTaxAtExit
  }

  const netCapital     = capitalGross - taxAtExit + netSavings
  const totalFees      = totalContribs * (fees / 100) * duration
  const perCapBreached = annualContrib > perAnnualCap

  return {
    capitalGross,
    totalContribs,
    totalFees,
    taxAtEntry: -totalTaxSavings,
    taxAtExit,
    netCapital,
    yearlyData,
    netSavings,
    totalTaxSavings,
    perCapBreached,
    annualReturn,
  }
}

// ── Orchestrateur ─────────────────────────────────────────────────────────────

export function compareEnvelopes(params) {
  // Chaque enveloppe reçoit son propre rendement ET ses propres frais
  const cto = simulateCTO({ ...params, annualReturn: params.ctoReturn, fees: params.ctoFees ?? 0 })
  const pea = simulatePEA({ ...params, annualReturn: params.peaReturn, fees: params.peaFees ?? 0 })
  const av  = simulateAV({  ...params, annualReturn: params.avReturn,  fees: params.avFees  ?? 0 })
  const per = simulatePER({ ...params, annualReturn: params.perReturn, fees: params.perFees ?? 0 })

  const envelopes = [
    { key: 'cto', label: 'CTO',           color: '#6b7280', ...cto },
    { key: 'pea', label: 'PEA',           color: '#6366f1', ...pea },
    { key: 'av',  label: 'Assurance-vie', color: '#10b981', ...av  },
    { key: 'per', label: 'PER',           color: '#f97316', ...per },
  ]

  const sorted = [...envelopes].sort((a, b) => b.netCapital - a.netCapital)
  sorted.forEach((e, i) => { e.rank = i + 1 })
  const byKey = Object.fromEntries(sorted.map(e => [e.key, e]))

  const chartData = Array.from({ length: params.duration }, (_, i) => ({
    year: i + 1,
    cto: cto.yearlyData[i]?.capital ?? 0,
    pea: pea.yearlyData[i]?.capital ?? 0,
    av:  av.yearlyData[i]?.capital  ?? 0,
    per: per.yearlyData[i]?.capital ?? 0,
  }))

  return { envelopes: byKey, ranking: sorted, winner: sorted[0], chartData }
}
