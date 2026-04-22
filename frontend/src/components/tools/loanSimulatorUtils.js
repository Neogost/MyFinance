export const CURRENT_YEAR = new Date().getFullYear()
export const LOAN_STORAGE_KEY = 'loan_simulations'
export const DONUT_COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#f97316', '#f59e0b']

export function fmt(amount) {
  if (amount == null || isNaN(amount) || !isFinite(amount)) return '—'
  return Math.round(amount).toLocaleString('fr-FR') + ' €'
}

export function fmtPct(val, decimals = 2) {
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
export function computeNotaryFees(price, type) {
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
export function computeMonthlyPayment(capital, annualRate, months) {
  if (!capital || capital <= 0 || months <= 0) return 0
  const r = annualRate / 100 / 12
  if (r === 0) return capital / months
  return capital * r / (1 - Math.pow(1 + r, -months))
}

// ── Dichotomie numérique ──────────────────────────────────────────────────────
function bisect(fn, low, high) {
  for (let i = 0; i < 70; i++) {
    const mid = (low + high) / 2
    if (fn(mid) < 0) low = mid; else high = mid
  }
  return (low + high) / 2
}

// ── TAEG estimé ───────────────────────────────────────────────────────────────
export function computeTAEG(loanAmount, rows, totalFees) {
  if (loanAmount <= 0 || rows.length === 0) return null
  const feesMonthly = totalFees / rows.length
  const cashFlows   = rows.map(r => r.mensualite + feesMonthly)
  function pv(rate) {
    if (rate === 0) return cashFlows.reduce((s, cf) => s + cf, 0)
    return cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i + 1), 0)
  }
  const monthlyRate = bisect(rate => loanAmount - pv(rate), 0, 0.1)
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100
}

// ── Tableau d'amortissement ───────────────────────────────────────────────────
export function buildAmortizationTable({
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
