import { describe, it, expect } from 'vitest'
import {
  fmt,
  fmtPct,
  computeNotaryFees,
  computeMonthlyPayment,
  computeTAEG,
  buildAmortizationTable,
} from '../../components/tools/loanSimulatorUtils'

// ── fmt ───────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('retourne "—" pour null', () => {
    expect(fmt(null)).toBe('—')
  })

  it('retourne "—" pour NaN', () => {
    expect(fmt(NaN)).toBe('—')
  })

  it('retourne "—" pour Infinity', () => {
    expect(fmt(Infinity)).toBe('—')
  })

  it('arrondit au nombre entier et ajoute " €"', () => {
    const result = fmt(1234.56)
    expect(result).toContain('€')
    expect(result).toContain('235') // arrondi 1235
  })

  it('formate 0 → "0 €"', () => {
    expect(fmt(0)).toBe('0 €')
  })
})

// ── fmtPct ────────────────────────────────────────────────────────────────────

describe('fmtPct', () => {
  it('retourne "—" pour null', () => {
    expect(fmtPct(null)).toBe('—')
  })

  it('retourne "—" pour NaN', () => {
    expect(fmtPct(NaN)).toBe('—')
  })

  it('formate avec 2 décimales par défaut et "%"', () => {
    const result = fmtPct(3.14)
    expect(result).toContain('%')
    expect(result).toContain('14')
  })

  it('respecte le paramètre decimals', () => {
    const result = fmtPct(3.14159, 0)
    expect(result).toBe('3 %')
  })
})

// ── computeNotaryFees ─────────────────────────────────────────────────────────

describe('computeNotaryFees', () => {
  it('retourne 0 si price est 0 ou null', () => {
    expect(computeNotaryFees(0, 'ancien').total).toBe(0)
    expect(computeNotaryFees(null, 'ancien').total).toBe(0)
  })

  it('frais ancien > frais neuf pour le même prix (droits mutation)', () => {
    const ancien = computeNotaryFees(300000, 'ancien')
    const neuf   = computeNotaryFees(300000, 'neuf')
    expect(ancien.total).toBeGreaterThan(neuf.total)
  })

  it('frais ancien : ~7-8 % du prix', () => {
    const result = computeNotaryFees(300000, 'ancien')
    expect(result.percent).toBeGreaterThan(6)
    expect(result.percent).toBeLessThan(9)
  })

  it('frais neuf : ~2-3 % du prix', () => {
    const result = computeNotaryFees(300000, 'neuf')
    expect(result.percent).toBeGreaterThan(1)
    expect(result.percent).toBeLessThan(4)
  })

  it('retourne un détail non vide', () => {
    const result = computeNotaryFees(200000, 'ancien')
    expect(result.detail.length).toBeGreaterThan(0)
    expect(result.detail[0]).toHaveProperty('label')
    expect(result.detail[0]).toHaveProperty('amount')
  })

  it('VEFA traité comme neuf', () => {
    const vefa = computeNotaryFees(300000, 'vefa')
    const neuf = computeNotaryFees(300000, 'neuf')
    expect(vefa.total).toBe(neuf.total)
  })
})

// ── computeMonthlyPayment ─────────────────────────────────────────────────────

describe('computeMonthlyPayment', () => {
  it('retourne 0 si capital est 0', () => {
    expect(computeMonthlyPayment(0, 3.5, 240)).toBe(0)
  })

  it('retourne 0 si durée est 0', () => {
    expect(computeMonthlyPayment(200000, 3.5, 0)).toBe(0)
  })

  it('remboursement linéaire quand taux = 0', () => {
    const result = computeMonthlyPayment(120000, 0, 120)
    expect(result).toBeCloseTo(1000, 0)
  })

  it('mensualité correcte : 200 000 € à 3.5 % sur 20 ans ≈ 1161 €', () => {
    const result = computeMonthlyPayment(200000, 3.5, 240)
    expect(result).toBeGreaterThan(1100)
    expect(result).toBeLessThan(1220)
  })

  it('mensualité plus élevée avec un taux plus élevé', () => {
    const low  = computeMonthlyPayment(200000, 2, 240)
    const high = computeMonthlyPayment(200000, 5, 240)
    expect(high).toBeGreaterThan(low)
  })

  it('mensualité plus élevée avec une durée plus courte', () => {
    const long  = computeMonthlyPayment(200000, 3.5, 300)
    const short = computeMonthlyPayment(200000, 3.5, 180)
    expect(short).toBeGreaterThan(long)
  })
})

// ── buildAmortizationTable ────────────────────────────────────────────────────

describe('buildAmortizationTable', () => {
  const BASE = {
    loanAmount: 100000, annualRate: 3, loanDurationYears: 10,
    insuranceRate: 0.3, insuranceBase: 'initial',
    ptzEnabled: false, ptzAmount: 0, ptzDurationYears: 0, ptzDeferralYears: 0,
    earlyRepayments: [],
  }

  it('retourne un tableau de lignes non vide', () => {
    const { rows } = buildAmortizationTable(BASE)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(120 + 12)
  })

  it('chaque ligne possède les champs requis', () => {
    const { rows } = buildAmortizationTable(BASE)
    const row = rows[0]
    expect(row).toHaveProperty('month')
    expect(row).toHaveProperty('interets')
    expect(row).toHaveProperty('amortissement')
    expect(row).toHaveProperty('assurance')
    expect(row).toHaveProperty('mensualite')
    expect(row).toHaveProperty('capitalMain')
  })

  it('le capital diminue au fil du temps', () => {
    const { rows } = buildAmortizationTable(BASE)
    expect(rows[rows.length - 1].capitalMain).toBeLessThan(rows[0].capitalMain)
  })

  it('le capital final est proche de 0', () => {
    const { rows } = buildAmortizationTable(BASE)
    expect(rows[rows.length - 1].capitalMain).toBeLessThan(1)
  })

  it('les intérêts décroissent globalement', () => {
    const { rows } = buildAmortizationTable(BASE)
    expect(rows[0].interets).toBeGreaterThan(rows[rows.length - 1].interets)
  })

  it('résumé annuel non vide', () => {
    const { annualSummary } = buildAmortizationTable(BASE)
    expect(annualSummary.length).toBeGreaterThan(0)
    expect(annualSummary[0]).toHaveProperty('year')
    expect(annualSummary[0]).toHaveProperty('interets')
  })

  it('PTZ activé : ptzPayment présent dans les lignes de remboursement', () => {
    const withPtz = buildAmortizationTable({
      ...BASE,
      ptzEnabled: true, ptzAmount: 20000,
      ptzDurationYears: 5, ptzDeferralYears: 2,
    })
    const ptzRows = withPtz.rows.filter(r => r.ptzPayment > 0)
    expect(ptzRows.length).toBeGreaterThan(0)
  })

  it('remboursement anticipé : capital réduit au mois cible', () => {
    const withER = buildAmortizationTable({
      ...BASE,
      earlyRepayments: [{ year: 2, amount: 10000, mode: 'reduce_duration' }],
    })
    const erRow = withER.rows.find(r => r.prepayment > 0)
    expect(erRow).toBeDefined()
    expect(erRow.prepayment).toBeCloseTo(10000, -1)
  })
})

// ── computeTAEG ───────────────────────────────────────────────────────────────

describe('computeTAEG', () => {
  it('retourne null si loanAmount est 0', () => {
    expect(computeTAEG(0, [], 0)).toBeNull()
  })

  it('retourne null si rows est vide', () => {
    expect(computeTAEG(100000, [], 0)).toBeNull()
  })

  it('TAEG > taux nominal quand frais > 0', () => {
    const { rows } = buildAmortizationTable({
      loanAmount: 100000, annualRate: 3, loanDurationYears: 10,
      insuranceRate: 0, insuranceBase: 'initial',
      ptzEnabled: false, ptzAmount: 0, ptzDurationYears: 0, ptzDeferralYears: 0,
      earlyRepayments: [],
    })
    const taeg = computeTAEG(100000, rows, 1000)
    expect(taeg).toBeGreaterThan(3)
  })
})
