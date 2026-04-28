import { describe, it, expect } from 'vitest'
import {
  computeCapacity,
  computeMonthlyPayment,
  computeLoanCost,
  buildAmortizationTable,
  computeMaxDrop,
  applyStressScenario,
  evaluateMarginCallRisk,
  computeSaleAlternative,
  computeAvgCapitalGainRatio,
  computeLeverageImpact,
  computeRateSensitivity,
  compareLtvScenarios,
} from '../../components/tools/lombardSimulatorUtils'
import { LTV_SCENARIOS } from '../../components/tools/lombardSimulatorConstants'

// ── computeCapacity ───────────────────────────────────────────────────────────

describe('computeCapacity', () => {
  it('calcule la capacité par catégorie selon le LTV map', () => {
    const portfolio = { BOURSE: 50000, LIVRET: 10000, IMMO_PHYSIQUE: 200000 }
    const ltv      = { BOURSE: 65, LIVRET: 95, IMMO_PHYSIQUE: 0 }
    const r = computeCapacity(portfolio, ltv)
    expect(r.byCategory.BOURSE).toBe(32500)
    expect(r.byCategory.LIVRET).toBe(9500)
    expect(r.byCategory.IMMO_PHYSIQUE).toBe(0)
    expect(r.total).toBe(42000)
    expect(r.totalValue).toBe(260000)
  })

  it('exclut les catégories à LTV 0 du calcul du LTV moyen', () => {
    const portfolio = { BOURSE: 50000, IMMO_PHYSIQUE: 100000 }
    const ltv      = { BOURSE: 60, IMMO_PHYSIQUE: 0 }
    const r = computeCapacity(portfolio, ltv)
    expect(r.eligibleValue).toBe(50000)  // hors IMMO_PHYSIQUE
    expect(r.avgLtv).toBe(60)            // 30000 / 50000 × 100
  })

  it('retourne avgLtv 0 si aucun actif éligible', () => {
    const r = computeCapacity({ IMMO_PHYSIQUE: 100000 }, { IMMO_PHYSIQUE: 0 })
    expect(r.total).toBe(0)
    expect(r.avgLtv).toBe(0)
  })
})

// ── computeMonthlyPayment ─────────────────────────────────────────────────────

describe('computeMonthlyPayment', () => {
  it('formule annuité standard (3.5 % sur 10 ans, 100k)', () => {
    const m = computeMonthlyPayment(100000, 3.5, 10)
    expect(m).toBeCloseTo(988.86, 1)  // ~988,86 €/mois
  })

  it('mensualité = capital / mois si taux 0', () => {
    expect(computeMonthlyPayment(120000, 0, 10)).toBe(1000)
  })
})

// ── computeLoanCost ───────────────────────────────────────────────────────────

describe('computeLoanCost', () => {
  it('mode in fine : intérêts mensuels constants, capital remboursé à l\'échéance', () => {
    const r = computeLoanCost(100000, 3, 5, 'in_fine')
    expect(r.monthlyPayment).toBeCloseTo(250, 1)        // 100k × 3% / 12
    expect(r.totalInterest).toBeCloseTo(15000, 0)        // 250 × 60
    expect(r.totalPaid).toBeCloseTo(115000, 0)
    expect(r.capitalAtMaturity).toBe(100000)
  })

  it('mode amortissable : mensualité constante, capital décroissant', () => {
    const r = computeLoanCost(100000, 3.5, 10, 'amortizable')
    expect(r.monthlyPayment).toBeCloseTo(988.86, 1)
    expect(r.capitalAtMaturity).toBe(0)
    // total intérêts ≈ 18 663 €
    expect(r.totalInterest).toBeGreaterThan(18000)
    expect(r.totalInterest).toBeLessThan(19000)
  })
})

// ── buildAmortizationTable ────────────────────────────────────────────────────

describe('buildAmortizationTable', () => {
  it('mode in fine : remboursement uniquement au dernier mois', () => {
    const rows = buildAmortizationTable(100000, 3, 1, 'in_fine')
    expect(rows).toHaveLength(12)
    expect(rows[0].principal).toBe(0)
    expect(rows[10].principal).toBe(0)
    expect(rows[11].principal).toBe(100000)
    expect(rows[11].remaining).toBe(0)
  })

  it('mode amortissable : capital remboursé décroissant à chaque mois', () => {
    const rows = buildAmortizationTable(100000, 3.5, 10, 'amortizable')
    expect(rows).toHaveLength(120)
    expect(rows[0].remaining).toBeLessThan(100000)
    expect(rows[119].remaining).toBeLessThan(1)  // ≈ 0 au bout de 10 ans
    // Les intérêts diminuent au fil du temps
    expect(rows[0].interest).toBeGreaterThan(rows[60].interest)
    expect(rows[60].interest).toBeGreaterThan(rows[119].interest)
  })
})

// ── computeMaxDrop ────────────────────────────────────────────────────────────

describe('computeMaxDrop', () => {
  it('retourne la chute tolérée avant déclenchement du margin call', () => {
    // Si emprunt 50k, portefeuille 100k, seuil 80%
    // Seuil portefeuille = 50k / 0.80 = 62.5k → chute tolérée = (1 − 62.5/100) = 37.5%
    const drop = computeMaxDrop(50000, 100000, 80)
    expect(drop).toBeCloseTo(37.5, 1)
  })

  it('retourne null si paramètres invalides', () => {
    expect(computeMaxDrop(0, 100000, 80)).toBeNull()
    expect(computeMaxDrop(50000, 0, 80)).toBeNull()
  })

  it('retourne 0 si déjà sous le seuil', () => {
    // Emprunt 90k, portefeuille 100k, seuil 80% → seuilPortefeuille = 112.5k > 100k déjà
    expect(computeMaxDrop(90000, 100000, 80)).toBe(0)
  })
})

// ── applyStressScenario ───────────────────────────────────────────────────────

describe('applyStressScenario', () => {
  it('applique les drawdowns par catégorie', () => {
    const portfolio = { BOURSE: 100000, LIVRET: 10000 }
    const drawdowns = { BOURSE: -0.5, LIVRET: 0 }
    const r = applyStressScenario(portfolio, drawdowns)
    expect(r.BOURSE).toBe(50000)
    expect(r.LIVRET).toBe(10000)
  })

  it('catégorie sans drawdown reste inchangée', () => {
    const r = applyStressScenario({ CRYPTO: 5000 }, {})
    expect(r.CRYPTO).toBe(5000)
  })
})

// ── evaluateMarginCallRisk ────────────────────────────────────────────────────

describe('evaluateMarginCallRisk', () => {
  it('safe : LTV effectif bien en-dessous du seuil', () => {
    // Emprunt 50k, portefeuille 200k → LTV 25%, seuil 80%
    const r = evaluateMarginCallRisk(50000, 200000, 80)
    expect(r.status).toBe('safe')
    expect(r.amountToComplete).toBe(0)
    expect(r.ltvEffective).toBe(25)
  })

  it('warning : LTV effectif proche du seuil (à moins de 5 pts)', () => {
    // Emprunt 50k, portefeuille 65k → LTV ≈ 76.9%, seuil 80% → warning
    const r = evaluateMarginCallRisk(50000, 65000, 80)
    expect(r.status).toBe('warning')
  })

  it('margin_call : valeur portefeuille < seuil', () => {
    // Emprunt 50k, portefeuille 50k → LTV 100%, seuil 80%
    const r = evaluateMarginCallRisk(50000, 50000, 80)
    expect(r.status).toBe('margin_call')
    expect(r.amountToComplete).toBeCloseTo(12500, 0)  // 62.5k - 50k
  })

  it('safe par défaut si emprunt nul', () => {
    expect(evaluateMarginCallRisk(0, 100000, 80).status).toBe('safe')
  })
})

// ── computeLeverageImpact ─────────────────────────────────────────────────────

describe('computeLeverageImpact', () => {
  it('arbitrage favorable si rendement net > coût intérêts', () => {
    const r = computeLeverageImpact({
      loanAmount: 100000, totalInterest: 20000, durationYears: 5,
      expectedReturn: 8, taxRate: 30,
    })
    // Valeur au terme : 100k × 1.08^5 ≈ 146 933
    expect(r.futureValue).toBeCloseTo(146932.81, 0)
    expect(r.grossGain).toBeCloseTo(46932.81, 0)
    expect(r.taxOnGain).toBeCloseTo(14079.84, 0)
    expect(r.netGain).toBeCloseTo(32852.97, 0)
    // Net leverage = 32 852 - 20 000 = 12 852
    expect(r.netLeverage).toBeGreaterThan(0)
  })

  it('arbitrage défavorable si rendement insuffisant', () => {
    const r = computeLeverageImpact({
      loanAmount: 100000, totalInterest: 30000, durationYears: 5,
      expectedReturn: 3, taxRate: 30,
    })
    expect(r.netLeverage).toBeLessThan(0)
    expect(r.breakEvenRate).toBeGreaterThan(0)
  })

  it('retourne null si emprunt nul', () => {
    expect(computeLeverageImpact({
      loanAmount: 0, totalInterest: 0, durationYears: 5,
      expectedReturn: 7, taxRate: 30,
    })).toBeNull()
  })
})

// ── computeRateSensitivity ────────────────────────────────────────────────────

describe('computeRateSensitivity', () => {
  it('génère les scénarios pour chaque delta', () => {
    const r = computeRateSensitivity({
      loanAmount: 100000, baseRate: 3, durationYears: 10,
      mode: 'in_fine', deltas: [-1, 0, 1],
    })
    expect(r).toHaveLength(3)
    expect(r[0].rate).toBe(2)
    expect(r[1].rate).toBe(3)
    expect(r[2].rate).toBe(4)
    expect(r[2].totalInterest).toBeGreaterThan(r[1].totalInterest)
  })

  it('clamp à 0 si delta rend le taux négatif', () => {
    const r = computeRateSensitivity({
      loanAmount: 100000, baseRate: 0.5, durationYears: 10,
      mode: 'in_fine', deltas: [-2],
    })
    expect(r[0].rate).toBe(0)
  })
})

// ── compareLtvScenarios ───────────────────────────────────────────────────────

describe('compareLtvScenarios', () => {
  it('produit une ligne par scénario avec capacité, mensualité, marge', () => {
    const portfolio = { BOURSE: 100000, LIVRET: 20000 }
    const r = compareLtvScenarios({
      valueByCategory: portfolio,
      scenarios: LTV_SCENARIOS,
      scenarioNames: ['prudent', 'realiste', 'optimiste'],
      loanAmount: 50000, mode: 'amount',
      annualRate: 3.5, durationYears: 10, repaymentMode: 'in_fine',
      marginCallThreshold: 85,
    })
    expect(r).toHaveLength(3)
    // Prudent : BOURSE 50% + LIVRET 90% = 50k + 18k = 68k
    expect(r[0].capacity).toBe(68000)
    // Optimiste : BOURSE 75% + LIVRET 100% = 75k + 20k = 95k
    expect(r[2].capacity).toBe(95000)
    // Tous suffisent pour 50k
    expect(r.every(s => !s.exceeded)).toBe(true)
  })

  it('marque exceeded si loanAmount > capacité (en mode amount)', () => {
    const portfolio = { BOURSE: 50000 }
    const r = compareLtvScenarios({
      valueByCategory: portfolio,
      scenarios: LTV_SCENARIOS,
      scenarioNames: ['prudent', 'realiste', 'optimiste'],
      loanAmount: 40000, mode: 'amount',
      annualRate: 3.5, durationYears: 10, repaymentMode: 'in_fine',
      marginCallThreshold: 85,
    })
    // Prudent : 50k × 50% = 25k → 40k > 25k → exceeded
    expect(r[0].exceeded).toBe(true)
    // Optimiste : 50k × 75% = 37.5k → 40k > 37.5k → exceeded aussi
    expect(r[2].exceeded).toBe(true)
  })
})

// ── computeSaleAlternative ────────────────────────────────────────────────────

describe('computeSaleAlternative', () => {
  it('calcule l\'impôt PFU et le manque à gagner', () => {
    const r = computeSaleAlternative({
      loanAmount: 100000, totalInterest: 15000,
      capitalGainRatio: 0.2,    // 20 % de plus-value latente
      capitalGainTaxRate: 30,
      expectedReturn: 5,
      durationYears: 10,
    })
    // taxFraction = 0.2 × 0.3 = 0.06
    // grossSale = 100k / (1 − 0.06) ≈ 106 383
    expect(r.grossSale).toBeCloseTo(106383, 0)
    expect(r.taxPaid).toBeCloseTo(6383, 0)
    // opportunityCost = 106383 × (1.05^10 − 1) ≈ 66 900
    expect(r.opportunityCost).toBeGreaterThan(66000)
    expect(r.opportunityCost).toBeLessThan(68000)
    expect(r.totalSaleCost).toBe(r.taxPaid + r.opportunityCost)
    // economy = totalSaleCost − totalInterest
    expect(r.economy).toBe(r.totalSaleCost - 15000)
  })
})

// ── computeAvgCapitalGainRatio ────────────────────────────────────────────────

describe('computeAvgCapitalGainRatio', () => {
  it('calcule le ratio moyen de plus-value latente', () => {
    const positions = [
      { computed: { currentValueEur: '50000', capitalGainEur: '10000' } },
      { computed: { currentValueEur: '30000', capitalGainEur: '5000' } },
    ]
    // Total value = 80k, total gain = 15k → ratio = 0.1875
    expect(computeAvgCapitalGainRatio(positions)).toBeCloseTo(0.1875, 3)
  })

  it('ignore les positions sans plus-value', () => {
    const positions = [
      { computed: { currentValueEur: '10000', capitalGainEur: '0' } },
    ]
    expect(computeAvgCapitalGainRatio(positions)).toBe(0)
  })

  it('plafonne à 1 même si la plus-value dépasse la valeur', () => {
    const positions = [
      { computed: { currentValueEur: '10000', capitalGainEur: '20000' } },
    ]
    expect(computeAvgCapitalGainRatio(positions)).toBe(1)
  })

  it('retourne 0 si liste vide', () => {
    expect(computeAvgCapitalGainRatio([])).toBe(0)
  })
})
