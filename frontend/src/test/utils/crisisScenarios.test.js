import { describe, it, expect } from 'vitest'
import {
  SCENARIOS,
  SCENARIO_ORDER,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from '../../components/tools/crisisScenarios'

describe('SCENARIOS', () => {
  it('contient les 5 scénarios définis', () => {
    expect(Object.keys(SCENARIOS)).toHaveLength(5)
  })

  it('tous les scénarios de SCENARIO_ORDER sont présents', () => {
    SCENARIO_ORDER.forEach(key => {
      expect(SCENARIOS).toHaveProperty(key)
    })
  })

  it('chaque scénario possède les champs requis', () => {
    Object.values(SCENARIOS).forEach(scenario => {
      expect(scenario).toHaveProperty('label')
      expect(scenario).toHaveProperty('description')
      expect(scenario).toHaveProperty('drawdowns')
      expect(scenario).toHaveProperty('postCrisisReturn')
    })
  })

  it('les drawdowns sont tous ≤ 0 sauf exceptions immobilier', () => {
    Object.values(SCENARIOS).forEach(scenario => {
      ['BOURSE', 'CRYPTO', 'LIVRET', 'LIQUIDITE'].forEach(cat => {
        expect(scenario.drawdowns[cat]).toBeLessThanOrEqual(0)
      })
    })
  })

  it('subprime-2008 : bourse perd 55 %', () => {
    expect(SCENARIOS['subprime-2008'].drawdowns.BOURSE).toBe(-0.55)
  })

  it('covid-2020 : récupération rapide (postCrisisReturn élevé)', () => {
    expect(SCENARIOS['covid-2020'].postCrisisReturn).toBeGreaterThan(
      SCENARIOS['subprime-2008'].postCrisisReturn
    )
  })

  it('crypto-2022 : crypto perd 75 %', () => {
    expect(SCENARIOS['crypto-2022'].drawdowns.CRYPTO).toBe(-0.75)
  })

  it('scénario custom : toutes les catégories ont un drawdown défini', () => {
    CATEGORY_ORDER.forEach(cat => {
      expect(SCENARIOS['custom'].drawdowns).toHaveProperty(cat)
    })
  })

  it('postCrisisReturn est un nombre positif pour tous les scénarios', () => {
    Object.values(SCENARIOS).forEach(scenario => {
      expect(scenario.postCrisisReturn).toBeGreaterThan(0)
    })
  })
})

describe('CATEGORY_ORDER', () => {
  it('contient les 6 catégories d\'actifs', () => {
    expect(CATEGORY_ORDER).toHaveLength(6)
    expect(CATEGORY_ORDER).toContain('BOURSE')
    expect(CATEGORY_ORDER).toContain('IMMO_PHYSIQUE')
    expect(CATEGORY_ORDER).toContain('CRYPTO')
    expect(CATEGORY_ORDER).toContain('LIVRET')
    expect(CATEGORY_ORDER).toContain('LIQUIDITE')
  })
})

describe('CATEGORY_LABELS', () => {
  it('chaque catégorie de CATEGORY_ORDER a un label', () => {
    CATEGORY_ORDER.forEach(cat => {
      expect(CATEGORY_LABELS).toHaveProperty(cat)
      expect(typeof CATEGORY_LABELS[cat]).toBe('string')
    })
  })
})
