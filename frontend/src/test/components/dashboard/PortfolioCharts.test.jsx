import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PatrimoineByCategoryChart from '../../../components/dashboard/PatrimoineByCategoryChart'
import CapitalGainsByCategoryChart from '../../../components/dashboard/CapitalGainsByCategoryChart'
import PatrimoineByCurrencyChart from '../../../components/dashboard/PatrimoineByCurrencyChart'
import PatrimoineByEnvelopeChart from '../../../components/dashboard/PatrimoineByEnvelopeChart'
import PatrimoineByMemberChart from '../../../components/dashboard/PatrimoineByMemberChart'

// Ces composants acceptent des positions via prop — pas de fetch API requis quand prop est fournie

const POSITIONS = [
  {
    id: 1, status: 'ACTIVE', category: 'BOURSE', fiscalEnvelope: 'PEA',
    currency: 'EUR', instrument: { id: 10, currency: 'EUR' },
    computed: { currentValueEur: 10000, capitalGainEur: 1500 },
  },
  {
    id: 2, status: 'ACTIVE', category: 'LIVRET', fiscalEnvelope: 'NONE',
    currency: 'EUR', instrument: null,
    computed: { currentValueEur: 5000, capitalGainEur: 0 },
  },
]

// ── PatrimoineByCategoryChart ──────────────────────────────────────────────────

describe('PatrimoineByCategoryChart', () => {
  it('affiche "Aucune position active" quand le tableau est vide', () => {
    render(<PatrimoineByCategoryChart positions={[]} />)
    expect(screen.getByText(/Aucune position active/)).toBeInTheDocument()
  })

  it('affiche le label de catégorie quand des positions sont fournies', () => {
    render(<PatrimoineByCategoryChart positions={POSITIONS} />)
    expect(screen.getByText('Bourse')).toBeInTheDocument()
  })

  it('affiche "Chargement…" quand positions=null (fetch API)', () => {
    vi.mock('../../../api/patrimoine', () => ({ getPositions: vi.fn(() => new Promise(() => {})) }))
    render(<PatrimoineByCategoryChart positions={null} />)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})

// ── CapitalGainsByCategoryChart ────────────────────────────────────────────────

describe('CapitalGainsByCategoryChart', () => {
  it('affiche "Aucune plus-value" quand toutes les plus-values sont nulles', () => {
    const positions = [{ id: 1, status: 'ACTIVE', category: 'LIVRET', computed: { capitalGainEur: 0 } }]
    render(<CapitalGainsByCategoryChart positions={positions} />)
    expect(screen.getByText(/Aucune plus-value/)).toBeInTheDocument()
  })

  it('affiche le label de catégorie quand des plus-values existent', () => {
    render(<CapitalGainsByCategoryChart positions={POSITIONS} />)
    expect(screen.getByText('Bourse')).toBeInTheDocument()
  })
})

// ── PatrimoineByCurrencyChart ──────────────────────────────────────────────────

describe('PatrimoineByCurrencyChart', () => {
  it('affiche "Aucune position active" quand le tableau est vide', () => {
    render(<PatrimoineByCurrencyChart positions={[]} />)
    expect(screen.getByText(/Aucune position active/)).toBeInTheDocument()
  })

  it('affiche le code devise EUR dans la légende', () => {
    render(<PatrimoineByCurrencyChart positions={POSITIONS} />)
    expect(screen.getByText('EUR')).toBeInTheDocument()
  })
})

// ── PatrimoineByEnvelopeChart ──────────────────────────────────────────────────

describe('PatrimoineByEnvelopeChart', () => {
  it('affiche "Aucune position active" quand le tableau est vide', () => {
    render(<PatrimoineByEnvelopeChart positions={[]} />)
    expect(screen.getByText(/Aucune position active/)).toBeInTheDocument()
  })

  it('affiche le label d\'enveloppe PEA dans la légende', () => {
    render(<PatrimoineByEnvelopeChart positions={POSITIONS} />)
    expect(screen.getByText('PEA')).toBeInTheDocument()
  })
})

// ── PatrimoineByMemberChart ────────────────────────────────────────────────────

describe('PatrimoineByMemberChart', () => {
  it('affiche "Aucune donnée" quand data est vide', () => {
    render(<PatrimoineByMemberChart data={[]} />)
    expect(screen.getByText(/Aucune donnée/)).toBeInTheDocument()
  })

  it('affiche "Aucune donnée" quand data est null/undefined', () => {
    render(<PatrimoineByMemberChart data={null} />)
    expect(screen.getByText(/Aucune donnée/)).toBeInTheDocument()
  })

  it('ne montre pas l\'état vide quand des données sont présentes', () => {
    const data = [{ name: 'Jean', value: 50000 }, { name: 'Marie', value: 30000 }]
    render(<PatrimoineByMemberChart data={data} />)
    expect(screen.queryByText(/Aucune donnée/)).not.toBeInTheDocument()
  })
})
