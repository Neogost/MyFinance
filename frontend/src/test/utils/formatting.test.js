import { describe, it, expect } from 'vitest'
import { fmt, fmtCompact, fmtUnits } from '../../components/patrimoine/utils.jsx'

// Versions locales redéfinies dans DettePage, PossessionPage, RecurringExpensePage.

const MONTHS_FR_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function fmtLocal(n) {
  return n?.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) ?? '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-')
  return `${parseInt(day, 10)} ${MONTHS_FR_SHORT[parseInt(month, 10) - 1]} ${year}`
}

function fmtPct(n) {
  if (n == null) return '—'
  return `${parseFloat(n).toFixed(2)} %`
}

// ── fmtLocal ─────────────────────────────────────────────────────────────────

describe('fmtLocal — version dupliquée dans les pages (DettePage, PossessionPage…)', () => {
  it('retourne "—" pour null', () => {
    expect(fmtLocal(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(fmtLocal(undefined)).toBe('—')
  })

  it('formate 0 avec 2 décimales', () => {
    expect(fmtLocal(0)).toBe('0,00')
  })

  it('formate 1234.56 avec séparateur de milliers et virgule décimale', () => {
    const result = fmtLocal(1234.56)
    expect(result).toContain('234,56')
    expect(result).toContain('1')
  })

  it('formate les nombres négatifs', () => {
    expect(fmtLocal(-500)).toContain('-500,00')
  })

  it('n\'ajoute PAS le symbole de devise (différence clé avec fmt centralisé)', () => {
    expect(fmtLocal(1000)).not.toContain('€')
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate — version locale (OtherIncomePage, PossessionPage, DettePage)', () => {
  it('retourne "—" pour null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('retourne "—" pour chaîne vide', () => {
    expect(formatDate('')).toBe('—')
  })

  it('formate "2025-03-15" → "15 Mar 2025"', () => {
    expect(formatDate('2025-03-15')).toBe('15 Mar 2025')
  })

  it('formate "2025-01-01" → "1 Jan 2025" (pas de zéro initial sur le jour)', () => {
    expect(formatDate('2025-01-01')).toBe('1 Jan 2025')
  })

  it('formate "2025-12-31" → "31 Déc 2025"', () => {
    expect(formatDate('2025-12-31')).toBe('31 Déc 2025')
  })

  it('formate "2025-08-05" → "5 Aoû 2025" (zéro initial ignoré)', () => {
    expect(formatDate('2025-08-05')).toBe('5 Aoû 2025')
  })

  it('formate "2025-06-20" → "20 Jun 2025"', () => {
    expect(formatDate('2025-06-20')).toBe('20 Jun 2025')
  })
})

// ── fmtPct ────────────────────────────────────────────────────────────────────

describe('fmtPct — version locale DettePage', () => {
  it('retourne "—" pour null', () => {
    expect(fmtPct(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(fmtPct(undefined)).toBe('—')
  })

  it('formate 3.14159 → "3.14 %" (2 décimales fixes)', () => {
    expect(fmtPct(3.14159)).toBe('3.14 %')
  })

  it('formate 0 → "0.00 %"', () => {
    expect(fmtPct(0)).toBe('0.00 %')
  })

  it('formate 100 → "100.00 %"', () => {
    expect(fmtPct(100)).toBe('100.00 %')
  })

  it('formate 2.5 → "2.50 %"', () => {
    expect(fmtPct(2.5)).toBe('2.50 %')
  })
})

// ── fmt centralisé (patrimoine/utils.jsx) ─────────────────────────────────────

describe('fmt — version centralisée patrimoine/utils.jsx', () => {
  it('retourne "—" pour null', () => {
    expect(fmt(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(fmt(undefined)).toBe('—')
  })

  it('ajoute " €" par défaut', () => {
    expect(fmt(1000)).toContain('€')
  })

  it('formate avec 2 décimales minimum', () => {
    expect(fmt(1234.5)).toContain('234,50')
  })

  it('supporte une devise autre (USD)', () => {
    const result = fmt(100, 'USD')
    expect(result).toContain('USD')
    expect(result).not.toContain('€')
  })

  it('formate 0 → contient "0,00"', () => {
    expect(fmt(0)).toContain('0,00')
  })

  it('différence clé avec fmtLocal : ajoute le symbole de devise', () => {
    expect(fmt(1234.56)).toContain('€')
    expect(fmtLocal(1234.56)).not.toContain('€')
  })
})

// ── fmtCompact centralisé ─────────────────────────────────────────────────────

describe('fmtCompact — version centralisée patrimoine/utils.jsx', () => {
  it('retourne "—" pour null', () => {
    expect(fmtCompact(null)).toBe('—')
  })

  it('retourne "—" pour undefined', () => {
    expect(fmtCompact(undefined)).toBe('—')
  })

  it('compacte les millions avec "M"', () => {
    expect(fmtCompact(1_500_000)).toContain('M')
  })

  it('compacte les milliers avec "K"', () => {
    expect(fmtCompact(12_345)).toContain('K')
  })

  it('affiche sans unité en dessous de 1000', () => {
    const result = fmtCompact(500)
    expect(result).not.toContain('K')
    expect(result).not.toContain('M')
  })

  it('gère les valeurs négatives', () => {
    expect(fmtCompact(-25_000)).toContain('-')
  })

  it('inclut le symbole € par défaut', () => {
    expect(fmtCompact(1000)).toContain('€')
  })
})

// ── fmtUnits centralisé ───────────────────────────────────────────────────────

describe('fmtUnits — version centralisée patrimoine/utils.jsx', () => {
  it('retourne null pour null', () => {
    expect(fmtUnits(null)).toBeNull()
  })

  it('affiche les entiers sans décimales superflues', () => {
    expect(fmtUnits(10)).toBe('10')
  })

  it('affiche les décimaux avec jusqu\'à 6 chiffres significatifs', () => {
    const result = fmtUnits(10.123456)
    expect(result).toContain('123')
  })

  it('affiche 0 comme "0"', () => {
    expect(fmtUnits(0)).toBe('0')
  })
})
