// Capacité d'emprunt par catégorie + total
export function computeCapacity(valueByCategory, ltvMap) {
  const byCategory = {}
  let total = 0
  Object.entries(valueByCategory).forEach(([cat, value]) => {
    const ltv = ltvMap[cat] ?? 0
    const capacity = value * ltv / 100
    byCategory[cat] = capacity
    total += capacity
  })
  const eligibleValue = Object.entries(valueByCategory)
    .filter(([cat]) => (ltvMap[cat] ?? 0) > 0)
    .reduce((s, [, v]) => s + v, 0)
  const totalValue = Object.values(valueByCategory).reduce((s, v) => s + v, 0)
  const avgLtv = eligibleValue > 0 ? (total / eligibleValue) * 100 : 0
  return { byCategory, total, totalValue, eligibleValue, avgLtv }
}

// Mensualité (mode amortissable uniquement)
export function computeMonthlyPayment(amount, annualRate, years) {
  const r = annualRate / 100 / 12
  const n = years * 12
  if (r === 0) return amount / n
  return amount * r / (1 - Math.pow(1 + r, -n))
}

// Coût total selon le mode de remboursement
export function computeLoanCost(amount, annualRate, years, mode) {
  if (mode === 'in_fine') {
    const monthlyInterest = amount * annualRate / 100 / 12
    const totalInterest = monthlyInterest * years * 12
    return {
      monthlyPayment:  monthlyInterest,           // intérêts seulement
      totalInterest,
      totalPaid:       totalInterest + amount,    // intérêts + remboursement final
      capitalAtMaturity: amount,
    }
  }
  // amortissable
  const monthly = computeMonthlyPayment(amount, annualRate, years)
  const totalPaid = monthly * years * 12
  return {
    monthlyPayment:  monthly,
    totalInterest:   totalPaid - amount,
    totalPaid,
    capitalAtMaturity: 0,
  }
}

// Tableau d'amortissement
export function buildAmortizationTable(amount, annualRate, years, mode) {
  const r = annualRate / 100 / 12
  const n = years * 12
  const rows = []

  if (mode === 'in_fine') {
    const monthlyInterest = amount * r
    let remaining = amount
    for (let m = 1; m <= n; m++) {
      const isLast = m === n
      rows.push({
        month: m,
        interest: monthlyInterest,
        principal: isLast ? amount : 0,
        payment: monthlyInterest + (isLast ? amount : 0),
        remaining: isLast ? 0 : remaining,
      })
    }
    return rows
  }

  // amortissable
  const monthly = computeMonthlyPayment(amount, annualRate, years)
  let remaining = amount
  for (let m = 1; m <= n; m++) {
    const interest = remaining * r
    const principal = Math.min(monthly - interest, remaining)
    remaining -= principal
    rows.push({
      month: m,
      interest,
      principal,
      payment: monthly,
      remaining: Math.max(0, remaining),
    })
  }
  return rows
}

// Margin call : seuil de chute du portefeuille tolérée
export function computeMaxDrop(loanAmount, currentValue, marginCallThresholdPct) {
  // Seuil = montant de portefeuille en dessous duquel un appel de marge est déclenché
  // Le seuil correspond à : loanAmount = portfolio × marginCallThreshold/100
  // Donc seuilPortefeuille = loanAmount / (marginCallThreshold/100)
  if (loanAmount <= 0 || currentValue <= 0) return null
  const seuilPortefeuille = loanAmount / (marginCallThresholdPct / 100)
  if (seuilPortefeuille >= currentValue) return 0  // déjà sous le seuil
  return (1 - seuilPortefeuille / currentValue) * 100
}

// Application d'un scénario de stress test
export function applyStressScenario(valueByCategory, drawdowns) {
  const result = {}
  Object.entries(valueByCategory).forEach(([cat, value]) => {
    const drawdown = drawdowns[cat] ?? 0
    result[cat] = value * (1 + drawdown)
  })
  return result
}

// Évaluation du risque margin call après stress
export function evaluateMarginCallRisk(loanAmount, postCrashValue, marginCallThresholdPct) {
  if (loanAmount <= 0) return { status: 'safe', amountToComplete: 0, ltvEffective: 0 }
  const ltvEffective = postCrashValue > 0 ? (loanAmount / postCrashValue) * 100 : 999
  const seuilPortefeuille = loanAmount / (marginCallThresholdPct / 100)

  let status
  let amountToComplete = 0
  if (postCrashValue < seuilPortefeuille) {
    status = 'margin_call'
    amountToComplete = seuilPortefeuille - postCrashValue
  } else if (ltvEffective > marginCallThresholdPct - 5) {
    status = 'warning'
  } else {
    status = 'safe'
  }
  return { status, amountToComplete, ltvEffective }
}

// Comparaison vente vs Lombard
export function computeSaleAlternative({
  loanAmount, totalInterest,
  capitalGainRatio,         // 0 à 1, ratio plus-value latente sur les actifs vendus
  capitalGainTaxRate = 30,  // PFU
  expectedReturn = 5,       // rendement annuel attendu (%)
  durationYears,
}) {
  // Pour récupérer loanAmount NET, il faut vendre un montant brut tel que
  //   brut × (1 − cgRatio × tax) = loanAmount
  const taxFraction = capitalGainRatio * capitalGainTaxRate / 100
  const grossSale   = taxFraction < 1 ? loanAmount / (1 - taxFraction) : loanAmount
  const taxPaid     = grossSale - loanAmount

  // Manque à gagner sur le rendement (les actifs vendus n'auraient pas été investis)
  const opportunityCost = grossSale * (Math.pow(1 + expectedReturn / 100, durationYears) - 1)

  const totalSaleCost   = taxPaid + opportunityCost
  const totalLombardCost = totalInterest

  return {
    grossSale,
    taxPaid,
    opportunityCost,
    totalSaleCost,
    totalLombardCost,
    economy: totalSaleCost - totalLombardCost,   // > 0 = Lombard avantageux
  }
}

// Effet de levier : impact de réinvestir le capital emprunté
export function computeLeverageImpact({
  loanAmount, totalInterest, durationYears,
  expectedReturn,        // %/an
  taxRate = 30,          // PFU sur la plus-value (%)
}) {
  if (loanAmount <= 0) return null
  const futureValue = loanAmount * Math.pow(1 + expectedReturn / 100, durationYears)
  const grossGain   = futureValue - loanAmount
  const taxOnGain   = Math.max(0, grossGain) * taxRate / 100
  const netGain     = grossGain - taxOnGain

  // Effet de levier net = gain net du réinvestissement - coût des intérêts
  const netLeverage = netGain - totalInterest
  const breakEvenRate = (() => {
    // Trouve r tel que loanAmount × (1+r)^d × (1-tax) - loanAmount × (1-tax × ratioPV) = totalInterest
    // Approximation : taux net ≈ taux brut × (1 − tax/100). Donc taux brut breakeven ≈ totalInterest/loanAmount/duration / (1-tax/100)
    if (durationYears <= 0) return 0
    const grossNeeded = (totalInterest / loanAmount) / durationYears
    return grossNeeded / (1 - taxRate / 100) * 100
  })()

  return {
    futureValue,
    grossGain,
    taxOnGain,
    netGain,
    totalInterest,
    netLeverage,
    breakEvenRate,
  }
}

// Sensibilité aux variations de taux (scénarios EURIBOR)
export function computeRateSensitivity({
  loanAmount, baseRate, durationYears, mode, deltas = [-1, 0, 1, 2, 3],
}) {
  return deltas.map(delta => {
    const rate = Math.max(0, baseRate + delta)
    const cost = computeLoanCost(loanAmount, rate, durationYears, mode)
    return {
      delta, rate,
      monthlyPayment: cost.monthlyPayment,
      totalInterest:  cost.totalInterest,
    }
  })
}

// Comparaison parallèle des scénarios LTV (sur un montant donné, ou la capacité de chacun)
export function compareLtvScenarios({
  valueByCategory, scenarios, scenarioNames,
  loanAmount, mode, annualRate, durationYears, repaymentMode, marginCallThreshold,
}) {
  return scenarioNames.map(name => {
    const ltvMap = scenarios[name]
    const cap    = computeCapacity(valueByCategory, ltvMap)
    const effective = mode === 'capacity' ? cap.total : Math.min(loanAmount, cap.total)
    const cost   = computeLoanCost(effective, annualRate, durationYears, repaymentMode)
    const drop   = computeMaxDrop(effective, cap.totalValue, marginCallThreshold)
    return {
      name, capacity: cap.total, avgLtv: cap.avgLtv,
      effectiveAmount: effective,
      monthlyPayment: cost.monthlyPayment,
      totalInterest:  cost.totalInterest,
      maxDrop:        drop,
      exceeded:       mode === 'amount' && loanAmount > cap.total,
    }
  })
}

// Plus-value latente totale du portefeuille (pour le ratio d'imposition)
export function computeAvgCapitalGainRatio(positions) {
  let totalValue = 0
  let totalGain  = 0
  positions.forEach(p => {
    const v = parseFloat(p.computed?.currentValueEur ?? 0)
    const g = parseFloat(p.computed?.capitalGainEur ?? 0)
    if (v > 0 && g > 0) {
      totalValue += v
      totalGain  += g
    }
  })
  if (totalValue <= 0) return 0
  return Math.min(1, totalGain / totalValue)
}
