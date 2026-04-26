import { describe, it, expect } from 'vitest'
import { computeSafetyNetTarget } from '../../utils/safetyNet'

const EXPENSES_SUMMARY = { totalMonthlyExpenses: 1800 }
const ACTIVE_CONTRACT  = { monthlyNetAfterTax: 2500 }

describe('computeSafetyNetTarget', () => {
  it('retourne null si user est null', () => {
    expect(computeSafetyNetTarget(null, EXPENSES_SUMMARY, ACTIVE_CONTRACT)).toBeNull()
  })

  it('retourne null si safetyNetMode est absent', () => {
    expect(computeSafetyNetTarget({ role: 'USER' }, EXPENSES_SUMMARY, ACTIVE_CONTRACT)).toBeNull()
  })

  // ── FIXED_AMOUNT ─────────────────────────────────────────────────────────

  it('FIXED_AMOUNT : retourne safetyNetAmount', () => {
    const user = { safetyNetMode: 'FIXED_AMOUNT', safetyNetAmount: 12000 }
    expect(computeSafetyNetTarget(user, null, null)).toBe(12000)
  })

  it('FIXED_AMOUNT : retourne null si safetyNetAmount est null', () => {
    const user = { safetyNetMode: 'FIXED_AMOUNT', safetyNetAmount: null }
    expect(computeSafetyNetTarget(user, null, null)).toBeNull()
  })

  it('FIXED_AMOUNT : retourne null si safetyNetAmount est undefined', () => {
    const user = { safetyNetMode: 'FIXED_AMOUNT' }
    expect(computeSafetyNetTarget(user, null, null)).toBeNull()
  })

  // ── MONTHS_EXPENSES ──────────────────────────────────────────────────────

  it('MONTHS_EXPENSES : retourne mois × dépenses mensuelles', () => {
    const user = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 3 }
    expect(computeSafetyNetTarget(user, EXPENSES_SUMMARY, null)).toBe(5400)
  })

  it('MONTHS_EXPENSES : retourne null si expensesSummary est null', () => {
    const user = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 3 }
    expect(computeSafetyNetTarget(user, null, null)).toBeNull()
  })

  it('MONTHS_EXPENSES : retourne null si totalMonthlyExpenses est 0', () => {
    const user = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 3 }
    expect(computeSafetyNetTarget(user, { totalMonthlyExpenses: 0 }, null)).toBeNull()
  })

  it('MONTHS_EXPENSES : retourne null si safetyNetMonths est 0', () => {
    const user = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 0 }
    expect(computeSafetyNetTarget(user, EXPENSES_SUMMARY, null)).toBeNull()
  })

  it('MONTHS_EXPENSES : calcul correct avec valeurs décimales', () => {
    const user = { safetyNetMode: 'MONTHS_EXPENSES', safetyNetMonths: 4.5 }
    expect(computeSafetyNetTarget(user, { totalMonthlyExpenses: 2000 }, null)).toBe(9000)
  })

  // ── MONTHS_SALARY ────────────────────────────────────────────────────────

  it('MONTHS_SALARY : retourne mois × salaire net mensuel', () => {
    const user = { safetyNetMode: 'MONTHS_SALARY', safetyNetMonths: 6 }
    expect(computeSafetyNetTarget(user, null, ACTIVE_CONTRACT)).toBe(15000)
  })

  it('MONTHS_SALARY : retourne null si activeContract est null', () => {
    const user = { safetyNetMode: 'MONTHS_SALARY', safetyNetMonths: 6 }
    expect(computeSafetyNetTarget(user, null, null)).toBeNull()
  })

  it('MONTHS_SALARY : retourne null si monthlyNetAfterTax est null', () => {
    const user = { safetyNetMode: 'MONTHS_SALARY', safetyNetMonths: 6 }
    expect(computeSafetyNetTarget(user, null, { monthlyNetAfterTax: null })).toBeNull()
  })

  it('MONTHS_SALARY : retourne null si monthlyNetAfterTax est 0', () => {
    const user = { safetyNetMode: 'MONTHS_SALARY', safetyNetMonths: 6 }
    expect(computeSafetyNetTarget(user, null, { monthlyNetAfterTax: 0 })).toBeNull()
  })

  it('MONTHS_SALARY : retourne null si safetyNetMonths est 0', () => {
    const user = { safetyNetMode: 'MONTHS_SALARY', safetyNetMonths: 0 }
    expect(computeSafetyNetTarget(user, null, ACTIVE_CONTRACT)).toBeNull()
  })
})
